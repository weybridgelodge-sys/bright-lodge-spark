import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { defaultSenderName } from "./send-email.ts";

Deno.test("default sender name is the Unit Setup formal sender name as saved", () => {
  assertEquals(defaultSenderName("Example Lodge No. 1"), "Example Lodge No. 1");
});
Deno.test("blank or missing formal sender name falls back to Your Lodge", () => {
  assertEquals(defaultSenderName(""), "Your Lodge");
  assertEquals(defaultSenderName(null), "Your Lodge");
  assertEquals(defaultSenderName("  "), "Your Lodge");
});
Deno.test("header-unsafe characters are stripped", () => {
  assertEquals(defaultSenderName('A "B" <c>\r\nD'), "A B c D");
});
