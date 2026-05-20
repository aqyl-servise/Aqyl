import { SetMetadata } from "@nestjs/common";

export const SKIP_ISOLATION_KEY = "skipIsolation";
export const SkipIsolation = () => SetMetadata(SKIP_ISOLATION_KEY, true);
