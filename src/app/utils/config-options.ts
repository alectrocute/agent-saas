import { DEFAULT_INSTANCE_CONFIG, configHiddenPaths } from '../../server/utils/defaultConfig'

export const configOptions = JSON.parse(JSON.stringify(DEFAULT_INSTANCE_CONFIG)) as Record<string, unknown>;

export { configHiddenPaths }