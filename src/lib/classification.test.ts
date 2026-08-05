import { describe, it, expect } from "vitest";
import { classifyGrade } from "./classification";

describe("classifyGrade", () => {
  it("classifies below 40 as FAIL, including the implicit case the spec doesn't name", () => {
    expect(classifyGrade(0)).toBe("FAIL");
    expect(classifyGrade(39.9)).toBe("FAIL");
  });

  it("classifies 40 up to (not including) 60 as PASS", () => {
    expect(classifyGrade(40)).toBe("PASS");
    expect(classifyGrade(59.9)).toBe("PASS");
  });

  it("classifies 60 up to (not including) 70 as MERIT", () => {
    expect(classifyGrade(60)).toBe("MERIT");
    expect(classifyGrade(69.9)).toBe("MERIT");
  });

  it("classifies 70 and above as DISTINCTION", () => {
    expect(classifyGrade(70)).toBe("DISTINCTION");
    expect(classifyGrade(100)).toBe("DISTINCTION");
  });
});
