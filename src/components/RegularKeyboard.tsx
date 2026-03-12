import { useEffect, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

type RegularKeyboardProps = {
  onClose?: () => void;
};

const KEYBOARD_PANEL_ID = "regular-keyboard-panel";

const RegularKeyboard = ({ onClose }: RegularKeyboardProps) => {
  const lastFocused = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [displayValue, setDisplayValue] = useState("");

  // Drag state
  const [pos, setPos] = useState({ x: window.innerWidth - 1100, y: window.innerHeight - 700 });
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragOrigin.current) return;
      setPos({
        x: dragOrigin.current.px + ev.clientX - dragOrigin.current.mx,
        y: dragOrigin.current.py + ev.clientY - dragOrigin.current.my,
      });
    };
    const onUp = () => {
      dragOrigin.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
        !target.closest(`#${KEYBOARD_PANEL_ID}`)
      ) {
        lastFocused.current = target;
        setDisplayValue(target.value);
      }
    };

    const onInput = (e: Event) => {
      if (e.target === lastFocused.current) {
        setDisplayValue((e.target as HTMLInputElement).value);
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("input", onInput);
    };
  }, []);

  const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const insert = (text: string) => {
    const el = lastFocused.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + text + el.value.slice(end);
    setNativeValue(el, next);
    el.focus();
    el.setSelectionRange(start + text.length, start + text.length);
    setDisplayValue(el.value);
  };

  const deleteLast = () => {
    const el = lastFocused.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start === end && start === 0) return;
    const next = start !== end
      ? el.value.slice(0, start) + el.value.slice(end)
      : el.value.slice(0, start - 1) + el.value.slice(start);
    const cursor = start !== end ? start : start - 1;
    setNativeValue(el, next);
    el.focus();
    el.setSelectionRange(cursor, cursor);
    setDisplayValue(el.value);
  };

  const handleKeyPress = (button: string) => {
    if (button === "{bksp}") { deleteLast(); return; }
    if (button === "{space}") { insert(" "); return; }
    if (button === "{lock}" || button === "{shift}") return;
    if (button === "{tab}") { insert("\t"); return; }
    if (button === "{enter}") {
      lastFocused.current?.form?.requestSubmit();
      return;
    }
    insert(button);
  };

  return (
    <div
      id={KEYBOARD_PANEL_ID}
      className="fixed z-[80] w-[1080px] rounded-[2rem] bg-white shadow-2xl p-6"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header — drag handle */}
      <div
        className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
      >
        <h3 className="text-2xl font-black text-slate-800">KEYBOARD</h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-3xl leading-none">
            ✕
          </button>
        )}
      </div>

      {/* Display */}
      <div className="bg-slate-100 rounded-2xl px-5 py-3 mb-4 min-h-[60px] flex items-center">
        <span className="text-3xl font-mono font-bold tracking-widest text-blue-600 break-all">
          {displayValue || <span className="text-slate-400 font-sans font-normal text-xl">Focus a text field…</span>}
        </span>
      </div>

      {/* Keyboard */}
      <Keyboard
        onKeyPress={handleKeyPress}
        layout={{
          default: [
            "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
            "{tab} q w e r t y u i o p [ ] \\",
            "{lock} a s d f g h j k l ; ' {enter}",
            "{shift} z x c v b n m , . / {shift}",
            "{space}",
          ],
        }}
        display={{
          "{bksp}": "⌫",
          "{enter}": "↵",
          "{shift}": "⇧",
          "{lock}": "Caps",
          "{tab}": "Tab",
          "{space}": "Space",
        }}
        theme="hg-theme-default"
        buttonTheme={[
          {
            class: "!bg-slate-800 !text-white hover:!bg-black !rounded-2xl !font-black !text-2xl !h-20",
            buttons:
              "` 1 2 3 4 5 6 7 8 9 0 - = q w e r t y u i o p [ ] \\ a s d f g h j k l ; ' z x c v b n m , . /",
          },
          {
            class: "!bg-slate-200 !text-slate-700 hover:!bg-slate-300 !rounded-2xl !font-black !text-2xl !h-20",
            buttons: "{bksp} {tab} {lock} {shift} {enter} {space}",
          },
        ]}
      />
    </div>
  );
};

export default RegularKeyboard;
