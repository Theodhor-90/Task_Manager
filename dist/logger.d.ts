export declare function initLogger(logDir: string): void;
export declare function log(context: string, phase: string, message: string, attempt?: {
    current: number;
    total: number;
}): void;
