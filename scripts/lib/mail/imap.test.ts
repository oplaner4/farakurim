import { describe, expect, it } from "vitest";
import { fakeMailbox } from "../test-helpers";
import { fileMessages, imapEnv, uidList } from "./imap";

describe("fileMessages", () => {
  it("moves each non-empty list to its folder", async () => {
    const { mailbox, move } = fakeMailbox([]);
    await fileMessages(mailbox, { processed: [1, 3], rejected: [2] });
    expect(move.mock.calls).toEqual([
      [[1, 3], "Zpracováno"],
      [[2], "Odmítnuto"],
    ]);
  });

  it("moves nothing for empty lists", async () => {
    const { mailbox, move } = fakeMailbox([]);
    await fileMessages(mailbox, { processed: [], rejected: [] });
    expect(move).not.toHaveBeenCalled();
  });
});

describe("imapEnv", () => {
  it("names the missing credentials", () => {
    expect(() => imapEnv({ IMAP_HOST: "h" })).toThrow("IMAP_USER, IMAP_PASSWORD");
    expect(imapEnv({ IMAP_HOST: "h", IMAP_USER: "u", IMAP_PASSWORD: "p" })).toEqual({
      host: "h",
      user: "u",
      password: "p",
    });
  });

  it("refuses an IMAP_HOST that is not a bare host name", () => {
    const login = { IMAP_USER: "u", IMAP_PASSWORD: "p" };
    for (const host of ["http://mail.cesky-hosting.cz/", "mail.cesky-hosting.cz:993", "mail.cesky-hosting.cz/"]) {
      expect(() => imapEnv({ ...login, IMAP_HOST: host })).toThrow("IMAP_HOST is a host name");
    }
    expect(imapEnv({ ...login, IMAP_HOST: " mail.cesky-hosting.cz " }).host).toBe("mail.cesky-hosting.cz");
  });
});

describe("uidList", () => {
  it("reads a comma-separated list and refuses anything else", () => {
    expect(uidList("1,3", "U")).toEqual([1, 3]);
    expect(uidList(undefined, "U")).toEqual([]);
    expect(() => uidList("a", "U")).toThrow("not a message uid");
  });
});
