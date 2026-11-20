import { React, TextInput } from "@webpack/common";

import { normalizeColor } from "../colors";
import { ColorValue } from "../types";

export function Section({ title, children }: React.PropsWithChildren<{ title: string; }>) {
    return (
        <div className="eu-section">
            <h5>{title}</h5>
            {children}
        </div>
    );
}

export function ToggleField(props: { label: string; value?: boolean; disabled?: boolean; onChange(v: boolean): void; }) {
    return (
        <label className={`eu-toggle${props.disabled ? " eu-disabled" : ""}`}>
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

export function TextField(props: { label: string; value?: string; disabled?: boolean; placeholder?: string; onChange(v: string): void; }) {
    return (
        <div className="eu-field">
            <div>{props.label}</div>
            <TextInput
                value={props.value ?? ""}
                disabled={props.disabled}
                placeholder={props.placeholder}
                onChange={props.onChange}
            />
        </div>
    );
}

export function ColorField(props: { label: string; value: ColorValue; disabled?: boolean; onChange(v: string | undefined): void; }) {
    const hex = normalizeColor(props.value);
    return (
        <div className={`eu-color${props.disabled ? " eu-disabled" : ""}`}>
            <div>{props.label}</div>
            <div className="eu-color-row">
                <input
                    type="color"
                    className={hex ? "" : "eu-unset"}
                    value={hex ?? "#000000"}
                    disabled={props.disabled}
                    onChange={e => props.onChange(e.target.value)}
                />
                <button type="button" className="eu-clear" disabled={!hex || props.disabled} onClick={() => props.onChange(undefined)}>
                    ✕
                </button>
            </div>
        </div>
    );
}

/** Проверка, что по ссылке лежит картинка (в браузере вместо HEAD-запроса грузим <img>). */
export function checkImage(url: string): Promise<boolean> {
    if (url.startsWith("data:image")) return Promise.resolve(true);

    return new Promise(resolve => {
        const img = new Image();
        const timer = setTimeout(() => resolve(false), 8000);
        img.onload = () => { clearTimeout(timer); resolve(true); };
        img.onerror = () => { clearTimeout(timer); resolve(false); };
        img.src = url;
    });
}

export function ImageUrlField(props: { label: string; value?: string; disabled?: boolean; invalidText: string; onChange(v: string): void; }) {
    const [text, setText] = React.useState(props.value ?? "");
    const [state, setState] = React.useState<"idle" | "ok" | "bad">(props.value ? "ok" : "idle");
    const timer = React.useRef<number>();

    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    function handle(v: string) {
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

    return (
        <div className="eu-field">
            <div>{props.label}</div>
            <TextInput value={text} disabled={props.disabled} placeholder="https://…" onChange={handle} />
            {state === "bad" && !props.disabled && <div className="eu-error">{props.invalidText}</div>}
            {state === "ok" && !props.disabled && <div className="eu-ok">✓</div>}
        </div>
    );
}
