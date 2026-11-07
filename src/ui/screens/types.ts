import type { SaveReadResult } from "../../game/save";

export interface SaveActions {
  read(): SaveReadResult;
  notice(): string | null;
  begin(): void;
  resume(): void;
  save(): void;
  returnToTitle(): void;
  export(): void;
  import(file: File): Promise<void>;
  delete(): void;
}
