export { ENTITY_CONFIG, type EntityKey } from './entities.js';
export declare const APP_CONFIG: {
    readonly name: "JARVIS";
    readonly version: "1.5.0";
    readonly api: {
        readonly port: number;
        readonly host: string;
        readonly cors_origins: string[];
    };
    readonly web: {
        readonly port: number;
        readonly url: string;
    };
    readonly pagination: {
        readonly default_page: 1;
        readonly default_per_page: 20;
        readonly max_per_page: 100;
    };
};
//# sourceMappingURL=index.d.ts.map