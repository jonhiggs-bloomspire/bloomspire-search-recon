import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  window.location.hash = "#/setup";
});

afterEach(() => {
  cleanup();
});
