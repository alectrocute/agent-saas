package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type logLine struct {
	TS     string `json:"ts"`
	Stream string `json:"stream"` // stdout|stderr|system
	Line   string `json:"line"`
}

type ringLogs struct {
	mu        sync.Mutex
	lines     []logLine
	next      int
	filled    bool
	capacity  int
	startedAt time.Time
}

func newRingLogs(capacity int) *ringLogs {
	return &ringLogs{
		lines:     make([]logLine, capacity),
		capacity: capacity,
		startedAt: time.Now(),
	}
}

func (r *ringLogs) append(stream, line string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.lines[r.next] = logLine{
		TS:     time.Now().UTC().Format(time.RFC3339Nano),
		Stream: stream,
		Line:   line,
	}
	r.next = (r.next + 1) % r.capacity
	if r.next == 0 {
		r.filled = true
	}
}

func (r *ringLogs) snapshot(tail int) (out []logLine, truncated bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var n int
	if r.filled {
		n = r.capacity
	} else {
		n = r.next
	}

	if tail <= 0 {
		tail = 200
	}
	if tail > 2000 {
		tail = 2000
	}
	if tail < n {
		truncated = true
	} else {
		tail = n
	}

	out = make([]logLine, 0, tail)
	start := n - tail
	for i := 0; i < tail; i++ {
		idx := (start + i)
		var pos int
		if r.filled {
			pos = (r.next + idx) % r.capacity
		} else {
			pos = idx
		}
		out = append(out, r.lines[pos])
	}
	return out, truncated
}

func ensureConfigFromEnv(logs *ringLogs) {
	cfg := os.Getenv("NANOBOT_CONFIG")
	if cfg == "" {
		return
	}
	// Nanobot expects root object to be the config (agents, providers, channels, ...).
	// If payload is {"config": {...}}, unwrap so we write only the inner object.
	toWrite := []byte(cfg)
	var parsed map[string]json.RawMessage
	if err := json.Unmarshal([]byte(cfg), &parsed); err == nil && len(parsed) == 1 {
		if inner, ok := parsed["config"]; ok {
			toWrite = inner
		}
	}
	// Strip top-level keys that nanobot Config schema does not allow (extra_forbidden).
	var configMap map[string]any
	if err := json.Unmarshal(toWrite, &configMap); err == nil {
		delete(configMap, "heartbeat")
		if cleaned, err := json.Marshal(configMap); err == nil {
			toWrite = cleaned
		}
	}
	dir := getNanobotDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		logs.append("system", fmt.Sprintf("failed to mkdir %s: %v", dir, err))
		return
	}
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, toWrite, 0o600); err != nil {
		logs.append("system", fmt.Sprintf("failed to write %s: %v", path, err))
		return
	}
	logs.append("system", fmt.Sprintf("wrote config.json (%d bytes)", len(toWrite)))
}

func getWorkspaceRoot() string {
	dir := filepath.Join(getNanobotDir(), "workspace")
	return dir
}

func getNanobotDir() string {
	dir := filepath.Join(os.Getenv("HOME"), ".nanobot")
	if dir == "" || strings.HasPrefix(dir, ".") {
		dir = "/root/.nanobot"
	}
	return dir
}

// resolvePersistPath returns absolute path for allowed logical path, or "" if invalid.
// Nanobot: config/auth in ~/.nanobot; cron, state, sessions in ~/.nanobot (data dir).
func resolvePersistPath(logicalPath string) string {
	nbDir := getNanobotDir()
	switch logicalPath {
	case "cron/jobs.json":
		return filepath.Join(nbDir, "cron", "jobs.json")
	case "state/state.json":
		return filepath.Join(nbDir, "state", "state.json")
	case "auth.json":
		return filepath.Join(nbDir, "auth.json")
	case "config.json":
		return filepath.Join(nbDir, "config.json")
	case "sessions":
		return filepath.Join(nbDir, "sessions") // list dir
	default:
		if strings.HasPrefix(logicalPath, "sessions/") {
			key := strings.TrimPrefix(logicalPath, "sessions/")
			// safe key: alphanumeric, dash, underscore, colon (nanobot uses channel:chat_id)
			for _, c := range key {
				if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == ':' {
					continue
				}
				return ""
			}
			if key == "" || len(key) > 256 {
				return ""
			}
			return filepath.Join(nbDir, "sessions", key+".json")
		}
		return ""
	}
}

// validWorkspacePath returns a safe absolute path under workspace, or "" if invalid.
func validWorkspacePath(workspaceRoot, rawPath string) string {
	rawPath = strings.TrimPrefix(rawPath, "/")
	if rawPath == "" || strings.Contains(rawPath, "..") {
		return ""
	}
	cleaned := filepath.Clean(rawPath)
	if strings.HasPrefix(cleaned, "..") {
		return ""
	}
	abs := filepath.Join(workspaceRoot, cleaned)
	// Ensure result is under workspace (no escape)
	rel, err := filepath.Rel(workspaceRoot, abs)
	if err != nil || strings.HasPrefix(rel, "..") {
		return ""
	}
	return abs
}

func pipeLines(prefix string, r io.Reader, logs *ringLogs) {
	sc := bufio.NewScanner(r)
	// allow large log lines
	buf := make([]byte, 0, 64*1024)
	sc.Buffer(buf, 1024*1024)
	for sc.Scan() {
		logs.append(prefix, sc.Text())
	}
	if err := sc.Err(); err != nil {
		logs.append("system", fmt.Sprintf("%s scanner error: %v", prefix, err))
	}
}

// waitForGateway blocks until 127.0.0.1:18790 accepts a connection or ctx is done / timeout.
func waitForGateway(ctx context.Context, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		d := net.Dialer{Timeout: 500 * time.Millisecond}
		conn, err := d.DialContext(ctx, "tcp", "127.0.0.1:18790")
		if err == nil {
			conn.Close()
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(200 * time.Millisecond):
		}
	}
	return false
}

// gatewayAccepting returns true if 127.0.0.1:18790 is accepting connections.
func gatewayAccepting() bool {
	d := net.Dialer{Timeout: 100 * time.Millisecond}
	conn, err := d.Dial("tcp", "127.0.0.1:18790")
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func startGatewayLoop(logs *ringLogs) {
	for {
		ensureConfigFromEnv(logs)

		cmd := exec.Command("picohost-gateway")
		cmd.Env = os.Environ()

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			logs.append("system", fmt.Sprintf("stdout pipe error: %v", err))
			time.Sleep(2 * time.Second)
			continue
		}
		stderr, err := cmd.StderrPipe()
		if err != nil {
			logs.append("system", fmt.Sprintf("stderr pipe error: %v", err))
			time.Sleep(2 * time.Second)
			continue
		}

		if err := cmd.Start(); err != nil {
			logs.append("system", fmt.Sprintf("failed to start gateway: %v", err))
			time.Sleep(2 * time.Second)
			continue
		}
		logs.append("system", fmt.Sprintf("gateway started (pid=%d)", cmd.Process.Pid))

		go pipeLines("stdout", stdout, logs)
		go pipeLines("stderr", stderr, logs)

		err = cmd.Wait()
		if err != nil {
			logs.append("system", fmt.Sprintf("gateway exited with error: %v", err))
		} else {
			logs.append("system", "gateway exited")
		}
		time.Sleep(1 * time.Second)
	}
}

func main() {
	_ = os.Setenv("HOME", "/root")

	logs := newRingLogs(4000)
	logs.append("system", "runner starting")

	// Gateway is started after restore (POST /internal/start-gateway) so cron/jobs.json etc. are present before nanobot loads them.
	var gatewayStartOnce sync.Once

	target, _ := url.Parse("http://127.0.0.1:18790")
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          32,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		// Return 503 and avoid default stderr log (connection refused is expected during startup/crash)
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte("gateway unavailable"))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/internal/start-gateway", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		gatewayStartOnce.Do(func() {
			logs.append("system", "start-gateway: starting gateway after restore")
			go startGatewayLoop(logs)
		})
		// Use background context so client disconnect/timeout doesn't abort the wait; gateway may take 10–30s to bind.
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		if !waitForGateway(ctx, 60*time.Second) {
			logs.append("system", "start-gateway: timeout waiting for gateway port 18790")
			w.Header().Set("content-type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"ok":false,"error":"gateway did not become ready"}`))
			return
		}
		logs.append("system", "start-gateway: gateway ready")
		w.Header().Set("content-type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})

	mux.HandleFunc("/internal/logs", func(w http.ResponseWriter, r *http.Request) {
		tail, _ := strconv.Atoi(r.URL.Query().Get("tail"))
		lines, truncated := logs.snapshot(tail)
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":        true,
			"tail":      tail,
			"truncated": truncated,
			"lines":     lines,
		})
	})

	mux.HandleFunc("/internal/agent", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		type reqBody struct {
			Message string `json:"message"`
		}
		var body reqBody
		if err := json.NewDecoder(io.LimitReader(r.Body, 64*1024)).Decode(&body); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}
		msg := body.Message
		if len(msg) == 0 {
			http.Error(w, "Missing message", http.StatusBadRequest)
			return
		}
		if len(msg) > 16_384 {
			http.Error(w, "Message too long", http.StatusRequestEntityTooLarge)
			return
		}

		if !gatewayAccepting() {
			w.Header().Set("content-type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"ok":false,"error":"gateway not ready"}`))
			return
		}

		logs.append("system", fmt.Sprintf("agent request start (bytes=%d)", len(msg)))

		ctx, cancel := context.WithTimeout(r.Context(), 130*time.Second)
		defer cancel()
		reqBodyBytes, _ := json.Marshal(map[string]string{"message": msg})
		req, err := http.NewRequestWithContext(ctx, "POST", "http://127.0.0.1:18790/agent", bytes.NewReader(reqBodyBytes))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			w.Header().Set("content-type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": err.Error()})
			logs.append("system", fmt.Sprintf("agent request error: %v", err))
			return
		}
		defer resp.Body.Close()
		for k, v := range resp.Header {
			if k == "Content-Length" {
				continue
			}
			for _, vv := range v {
				w.Header().Add(k, vv)
			}
		}
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, io.LimitReader(resp.Body, 256*1024+512))
		if resp.StatusCode == http.StatusOK {
			logs.append("system", "agent request ok")
		} else {
			logs.append("system", fmt.Sprintf("agent request status %d", resp.StatusCode))
		}
	})

	// Workspace: markdown files in instance workspace folder
	mux.HandleFunc("/internal/workspace", func(w http.ResponseWriter, r *http.Request) {
		root := getWorkspaceRoot()
		switch r.Method {
		case http.MethodGet:
			if r.URL.Query().Get("list") == "1" {
				_ = os.MkdirAll(root, 0o755)
				var files []string
				_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
					if err != nil {
						return nil
					}
					if info.IsDir() {
						return nil
					}
					if strings.HasSuffix(strings.ToLower(info.Name()), ".md") {
						rel, _ := filepath.Rel(root, path)
						if rel != "" && !strings.Contains(rel, "..") {
							files = append(files, filepath.ToSlash(rel))
						}
					}
					return nil
				})
				w.Header().Set("content-type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "files": files})
				return
			}
			pathParam := r.URL.Query().Get("path")
			if pathParam == "" {
				http.Error(w, "Missing path", http.StatusBadRequest)
				return
			}
			if !strings.HasSuffix(strings.ToLower(pathParam), ".md") {
				http.Error(w, "Only .md files allowed", http.StatusBadRequest)
				return
			}
			abs := validWorkspacePath(root, pathParam)
			if abs == "" {
				http.Error(w, "Invalid path", http.StatusBadRequest)
				return
			}
			data, err := os.ReadFile(abs)
			if err != nil {
				if os.IsNotExist(err) {
					http.Error(w, "Not found", http.StatusNotFound)
					return
				}
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("content-type", "text/markdown; charset=utf-8")
			_, _ = w.Write(data)

		case http.MethodPut:
			var body struct {
				Path    string `json:"path"`
				Content string `json:"content"`
			}
			if err := json.NewDecoder(io.LimitReader(r.Body, 2*1024*1024)).Decode(&body); err != nil {
				http.Error(w, "Invalid JSON body", http.StatusBadRequest)
				return
			}
			if body.Path == "" {
				http.Error(w, "Missing path", http.StatusBadRequest)
				return
			}
			if !strings.HasSuffix(strings.ToLower(body.Path), ".md") {
				http.Error(w, "Only .md files allowed", http.StatusBadRequest)
				return
			}
			abs := validWorkspacePath(root, body.Path)
			if abs == "" {
				http.Error(w, "Invalid path", http.StatusBadRequest)
				return
			}
			if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if err := os.WriteFile(abs, []byte(body.Content), 0o644); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("content-type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})

		case http.MethodDelete:
			pathParam := r.URL.Query().Get("path")
			if pathParam == "" {
				http.Error(w, "Missing path", http.StatusBadRequest)
				return
			}
			if !strings.HasSuffix(strings.ToLower(pathParam), ".md") {
				http.Error(w, "Only .md files allowed", http.StatusBadRequest)
				return
			}
			abs := validWorkspacePath(root, pathParam)
			if abs == "" {
				http.Error(w, "Invalid path", http.StatusBadRequest)
				return
			}
			if err := os.Remove(abs); err != nil {
				if os.IsNotExist(err) {
					http.Error(w, "Not found", http.StatusNotFound)
					return
				}
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("content-type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	// Generic persist: cron, state, sessions, auth, config
	mux.HandleFunc("/internal/persist", func(w http.ResponseWriter, r *http.Request) {
		logicalPath := r.URL.Query().Get("path")
		if logicalPath == "" {
			logs.append("system", "persist: missing path")
			http.Error(w, "Missing path", http.StatusBadRequest)
			return
		}
		absPath := resolvePersistPath(logicalPath)
		if absPath == "" {
			logs.append("system", fmt.Sprintf("persist: invalid path %q", logicalPath))
			http.Error(w, "Invalid path", http.StatusBadRequest)
			return
		}
		logs.append("system", fmt.Sprintf("persist: %s path=%s", r.Method, logicalPath))
		switch r.Method {
		case http.MethodGet:
			if logicalPath == "sessions" {
				_ = os.MkdirAll(absPath, 0o755)
				entries, err := os.ReadDir(absPath)
				if err != nil {
					logs.append("system", fmt.Sprintf("persist: GET sessions list error: %v", err))
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				var keys []string
				for _, e := range entries {
					if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".json") {
						keys = append(keys, strings.TrimSuffix(e.Name(), ".json"))
					}
				}
				logs.append("system", fmt.Sprintf("persist: GET sessions ok (%d keys)", len(keys)))
				w.Header().Set("content-type", "application/json")
				_ = json.NewEncoder(w).Encode(keys)
				return
			}
			data, err := os.ReadFile(absPath)
			if err != nil {
				if os.IsNotExist(err) {
					logs.append("system", fmt.Sprintf("persist: GET %s (not found, return {})", logicalPath))
					w.Header().Set("content-type", "application/json")
					_, _ = w.Write([]byte("{}"))
					return
				}
				logs.append("system", fmt.Sprintf("persist: GET %s error: %v", logicalPath, err))
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			logs.append("system", fmt.Sprintf("persist: GET %s ok (%d bytes)", logicalPath, len(data)))
			w.Header().Set("content-type", "application/json")
			_, _ = w.Write(data)
		case http.MethodPut:
			if logicalPath == "sessions" {
				logs.append("system", "persist: PUT sessions (rejected)")
				http.Error(w, "Cannot PUT to sessions list", http.StatusBadRequest)
				return
			}
			data, err := io.ReadAll(io.LimitReader(r.Body, 512*1024))
			if err != nil {
				logs.append("system", fmt.Sprintf("persist: PUT %s read error: %v", logicalPath, err))
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			_ = os.MkdirAll(filepath.Dir(absPath), 0o755)
			if err := os.WriteFile(absPath, data, 0o600); err != nil {
				logs.append("system", fmt.Sprintf("persist: PUT %s error: %v", logicalPath, err))
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			logs.append("system", fmt.Sprintf("persist: PUT %s ok (%d bytes)", logicalPath, len(data)))
			w.Header().Set("content-type", "application/json")
			_, _ = w.Write([]byte(`{"ok":true}`))
		default:
			logs.append("system", fmt.Sprintf("persist: method not allowed %s", r.Method))
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if gatewayAccepting() {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("gateway not ready"))
		}
	})
	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		if gatewayAccepting() {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("gateway not ready"))
		}
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Preserve host for upstream routing if needed
		r.Host = target.Host
		proxy.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	addr := "0.0.0.0:" + port
	logs.append("system", "runner listening on "+addr+" (proxy -> 127.0.0.1:18790)")
	_ = http.ListenAndServe(addr, mux)
}

