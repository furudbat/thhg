import { MetaDataValue } from "./metadata.value";

export interface LoadedLayoutValue {
    id: string;
    template: string;
    config: unknown;
    css: string;
    meta: MetaDataValue;
    name: string;
    configlink: string;
    template_engine: string;
}