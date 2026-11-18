export function LoadingNote({ children }) {
  return (
    <p className="bspre-loading" role="status">
      {children}
    </p>
  );
}

export function ErrorNote({ children }) {
  if (!children) {
    return null;
  }
  return (
    <p className="bspre-error" role="alert">
      {children}
    </p>
  );
}
