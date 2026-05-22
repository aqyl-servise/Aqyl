import { SetMetadata } from "@nestjs/common";

export const SKIP_SCHOOL_ISOLATION_KEY = "skipSchoolIsolation";
export const SkipSchoolIsolation = () => SetMetadata(SKIP_SCHOOL_ISOLATION_KEY, true);
