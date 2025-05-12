interface SRIWindow extends Window {
    SRI?: {
        config: {
            [key: string]: string;
        };
    };
}
declare const win: SRIWindow;
