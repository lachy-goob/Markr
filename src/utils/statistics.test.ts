import {
  calculateMean,
  calculateStdDev,
  calculateMin,
  calculateMax,
  calculatePercentile,
} from "./statistics";
import { describe, it, expect } from "vitest";

describe("Statistics Functions", () => {
  describe("calculateMean", () => {
    it("should return 0 for an empty array", () => {
      expect(calculateMean([])).toBe(0);
    });

    it("should calculate the mean correctly for an array of numbers", () => {
      expect(calculateMean([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateMean([1, 2, 3])).toBe(2);
      expect(calculateMean([1.5, 2.5, 3.5])).toBe(2.5);
    });
  });

  describe("calculateStdDev", () => {
    it("should return 0 for an empty array", () => {
      expect(calculateStdDev([], 0)).toBe(0);
    });

    it("should calculate the standard deviation correctly for an array of numbers", () => {
      expect(calculateStdDev([1, 2, 3, 4, 5], 3)).toBeCloseTo(1.414, 3);
      expect(calculateStdDev([1, 2, 3], 2)).toBeCloseTo(0.816, 3);
      expect(calculateStdDev([1.5, 2.5, 3.5], 2.5)).toBeCloseTo(0.816, 3);
    });
  });

  describe("calculateMin", () => {
    it("should return Infinity for an empty array", () => {
      expect(calculateMin([])).toBe(0);
    });

    it("should calculate the minimum value correctly for an array of numbers", () => {
      expect(calculateMin([1, 2, 3, 4, 5])).toBe(1);
      expect(calculateMin([5, 4, 3, 2, 1])).toBe(1);
      expect(calculateMin([1.5, 2.5, 3.5])).toBe(1.5);
    });
  });

  describe("calculateMax", () => {
    it("should return -Infinity for an empty array", () => {
      expect(calculateMax([])).toBe(0);
    });

    it("should calculate the maximum value correctly for an array of numbers", () => {
      expect(calculateMax([1, 2, 3, 4, 5])).toBe(5);
      expect(calculateMax([5, 4, 3, 2, 1])).toBe(5);
      expect(calculateMax([1.5, 2.5, 3.5])).toBe(3.5);
    });
  });

  describe("calculatePercentile", () => {
    it("should return 0 for an empty array", () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    it("should return the correct percentile for an array of numbers", () => {
      expect(calculatePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
      expect(calculatePercentile([1, 2, 3, 4, 5], 25)).toBe(2);
      expect(calculatePercentile([1, 2, 3, 4, 5], 75)).toBe(4);
      expect(calculatePercentile([1.5, 2.5, 3.5], 50)).toBe(2.5);
    });
  });
});
