import { invoke } from "@tauri-apps/api/core";
import { vi } from "vitest";

export const invokeMock = vi.mocked(invoke);

type TauriCommandHandler = unknown | ((args: unknown) => unknown | Promise<unknown>);

export function mockTauriCommands(handlers: Record<string, TauriCommandHandler>) {
  invokeMock.mockImplementation(async (command, args) => {
    if (!(command in handlers)) {
      throw new Error(`Unhandled invoke command: ${command}`);
    }

    const handler = handlers[command];
    return typeof handler === "function" ? handler(args) : handler;
  });
}
