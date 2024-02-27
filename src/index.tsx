// Copyright (c) Meta Platforms, Inc. and affiliates.
// All rights reserved.

// This source code is licensed under the license found in the
// LICENSE file in the root directory of this source tree.

import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppContextProvider from "./components/hooks/context";
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <AppContextProvider>
    <App />
  </AppContextProvider>
);
