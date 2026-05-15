import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";

describe("schema", () => {
  it("connects and counts users", async () => {
    const n = await prisma.user.count();
    expect(typeof n).toBe("number");
  });
});
