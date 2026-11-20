import { React, TextInput } from "@webpack/common";

async function checkImage(url: string): Promise<boolean> {
    if (url.startsWith("data:image")) return Promise.resolve(true);

    return new Promise(resolve => {
        const img = new Image();
        const timer = window.setTimeout(() => {
            cleanup();
            resolve(false);
        }, 5000);

        function cleanup() {
            window.clearTimeout(timer);
            img.onload = null;
            img.onerror = null;
        }

        img.onload = () => {
            cleanup();
            resolve(true);
        };
        img.onerror = () => {
            cleanup();
            resolve(false);
        };
        img.src = url;
    });
}

export function Section(props: { title: string; children: React.ReactNode; }) {
    return (
        <div className="eu-section">
            <h5>{props.title}</h5>
            {props.children}
        </div>
    );
}

export function TextField(props: { label: string; value?: string; placeholder?: string; disabled?: boolean; onChange(v: string): void; }) {
    return (
        <div className="eu-field">
            <div>{props.label}</div>
            <TextInput
                value={props.value ?? ""}
                placeholder={props.placeholder}
                disabled={props.disabled}
                onChange={props.onChange}
            />
        </div>
    );
}

export function ToggleField(props: { label: string; value?: boolean; disabled?: boolean; className?: string; onChange(v: boolean): void; }) {
    return (
        <label className={`eu-toggle ${props.disabled ? "eu-disabled" : ""} ${props.className ?? ""}`}>
            <input
                type="checkbox"
                checked={!!props.value}
                disabled={props.disabled}
                onChange={e => props.onChange(e.target.checked)}
            />
            <span>{props.label}</span>
        </label>
    );
}

export function ColorField(props: { label: string; value?: number; disabled?: boolean; onChange(v: number | undefined): void; }) {
    const hasColor = typeof props.value === "number";
    const hex = hasColor
        ? `#${props.value!.toString(16).padStart(6, "0")}`
        : "#5865f2";

    function handleColor(e: React.ChangeEvent<HTMLInputElement>) {
        const parsed = parseInt(e.target.value.slice(1), 16);
        if (!Number.isNaN(parsed)) {
            props.onChange(parsed);
        }
    }

    return (
        <div className="eu-color">
            <div>{props.label}</div>
            <div className="eu-color-row">
                <input
                    type="color"
                    value={hex}
                    disabled={props.disabled}
                    className={!hasColor ? "eu-unset" : undefined}
                    onChange={handleColor}
                />
                <button
                    type="button"
                    className="eu-clear"
                    disabled={props.disabled || !hasColor}
                    onClick={() => props.onChange(undefined)}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export function ImageUrlField(props: { label: string; value?: string; disabled?: boolean; invalidText: string; onChange(v: string): void; }) {
    const initialValue = props.value ?? "";
    const isInitialDataUrl = initialValue.startsWith("data:image");
    const isInitialGif = initialValue.startsWith("data:image/gif") || /\.gif(\?.*)?$/i.test(initialValue);

    const [text, setText] = React.useState(isInitialDataUrl ? "" : initialValue);
    const [hasFile, setHasFile] = React.useState(isInitialDataUrl);
    const [isGif, setIsGif] = React.useState(isInitialGif);
    const [state, setState] = React.useState<"idle" | "ok" | "bad">(props.value ? "ok" : "idle");
    const timer = React.useRef<number>();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    function handle(v: string) {
        setHasFile(false);
        setIsGif(/\.gif(\?.*)?$/i.test(v.trim()));
        setText(v);
        window.clearTimeout(timer.current);

        const url = v.trim();
        if (!url) {
            setState("idle");
            props.onChange("");
            return;
        }

        timer.current = window.setTimeout(async () => {
            const ok = await checkImage(url);
            setState(ok ? "ok" : "bad");
            props.onChange(ok ? url : "");
        }, 800);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        window.clearTimeout(timer.current);

        const fileIsGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
        if (!file.type.startsWith("image/") && !fileIsGif) {
            setState("bad");
            setIsGif(false);
            props.onChange("");
            return;
        }

        const maxBytes = fileIsGif ? 10 * 1024 * 1024 : 3 * 1024 * 1024;
        if (file.size > maxBytes) {
            setState("bad");
            setIsGif(false);
            props.onChange("");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result.startsWith("data:image")) {
                setState("bad");
                setIsGif(false);
                props.onChange("");
                return;
            }
            setText("");
            setHasFile(true);
            setIsGif(fileIsGif || result.startsWith("data:image/gif"));
            setState("ok");
            props.onChange(result);
        };
        reader.onerror = () => {
            setState("bad");
            setIsGif(false);
            props.onChange("");
        };
        reader.readAsDataURL(file);
    }

    function clearValue() {
        window.clearTimeout(timer.current);
        setText("");
        setHasFile(false);
        setIsGif(false);
        setState("idle");
        props.onChange("");
    }

    return (
        <div className="eu-field">
            <div>{props.label}</div>
            <TextInput value={text} disabled={props.disabled} placeholder="https://… (.png, .jpg, .webp, .gif)" onChange={handle} />
            <div className="eu-file-row">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.gif,image/gif"
                    disabled={props.disabled}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    className="eu-file-btn"
                    disabled={props.disabled}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {hasFile ? "Заменить файл" : "Выбрать файл"}
                </button>
                {(text || hasFile) && !props.disabled && (
                    <button type="button" className="eu-file-clear" onClick={clearValue}>
                        Очистить
                    </button>
                )}
                {hasFile && (
                    <span className="eu-file-badge">
                        {isGif ? "GIF загружен" : "Файл загружен"}
                    </span>
                )}
            </div>
            {state === "bad" && !props.disabled && <div className="eu-error">{props.invalidText}</div>}
            {state === "ok" && !props.disabled && <div className="eu-ok">✓</div>}
        </div>
    );
}
