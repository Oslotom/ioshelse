/** Bound a native operation without deleting data or changing its stored values. */
export function withDeadline<T>(
  operation: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Import storage is optional: it must never gate the initial app screen. */
export async function restoreStartupState<T, U>(options: {
  readPreferences: () => Promise<T>;
  onPreferences: (value: T) => void;
  onReady: () => void;
  readImport: () => Promise<U>;
  onImport: (value: U) => void;
  onError: (error: unknown) => void;
  preferenceTimeout?: number;
  importTimeout?: number;
}) {
  try {
    const preferences = await withDeadline(
      options.readPreferences(),
      options.preferenceTimeout ?? 5000,
      "Innstillingene bruker for lang tid på å åpne. Lagrede data er beholdt.",
    );
    options.onPreferences(preferences);
  } catch (error) {
    options.onError(error);
  } finally {
    options.onReady();
  }
  // Signal readiness BEFORE starting the optional database restore.
  try {
    const imported = await withDeadline(
      options.readImport(),
      options.importTimeout ?? 10000,
      "Importdatabasen bruker for lang tid på å åpne. Du kan bruke skrittelleren eller demodata i mellomtiden.",
    );
    options.onImport(imported);
  } catch (error) {
    options.onError(error);
  }
}
