import { downloadTextFile } from "./download";

test("downloads a CSV blob and revokes the object URL", () => {
  const create = jest.fn(() => "blob:recon");
  const revoke = jest.fn();
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  downloadTextFile("recon-RUN-1042.csv", "id\r\n1-IND10");

  expect(create).toHaveBeenCalled();
  expect(click).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:recon");
  expect(document.body.querySelector("a")).toBeNull();

  click.mockRestore();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});
