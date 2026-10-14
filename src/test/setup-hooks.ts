import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Setup of the hook tests (src/hooks/, vitest.config.mts): every test starts without the components the one before it
// rendered. A component left mounted keeps its subscriptions, such as the shared clock of useNow().
afterEach(cleanup);
