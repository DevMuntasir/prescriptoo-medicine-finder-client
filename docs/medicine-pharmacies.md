# Adding pharmacy locations to existing medicines

The Medicines table now offers **Add pharmacies** for non-archived medicines when the actor has `mappings.read`, `mappings.write`, and `pharmacies.read`. The dialog loads all pharmacy pages, excludes archived locations, supports name/address search and multiple selections, and displays existing active mappings as checked, disabled choices.

Saving uses the existing authorized mapping endpoints. Inactive links are reactivated with their latest revision and stock information preserved. The dialog refreshes mappings before each write so retries can recognize committed links. Writes are sequential and are not atomic as a group: completed locations remain linked, and failed/remaining selections stay available for retry. Publication state is not changed by this UI.

Create new pharmacy records through Pharmacies, then select them from the medicine's Add pharmacies action.

Verification (2026-10-04): TypeScript and ESLint passed. Three Playwright tests passed using mocked API responses: existing-medicine pagination/search/linking/reactivation/partial-save retry, mapping write permission gating, and the original medicine setup regression. These browser tests do not establish live database persistence; backend mapping behavior is reused without changes.
