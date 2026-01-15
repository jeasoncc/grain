/**
 * @fileoverview Import rules index
 * @author Grain Team
 */

import importGrouping from "./import-grouping.js"
import noBannedImports from "./no-banned-imports.js"
import noDefaultExport from "./no-default-export.js"
import noDeprecatedImports from "./no-deprecated-imports.js"
import requireAlias from "./require-alias.js"

export default {
	"no-default-export": noDefaultExport,
	"no-banned-imports": noBannedImports,
	"require-alias": requireAlias,
	"import-grouping": importGrouping,
	"no-deprecated-imports": noDeprecatedImports,
}
