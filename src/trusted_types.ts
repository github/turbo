interface CSPTrustedHTMLToStringable {
  toString: () => string
}

interface CSPTrustedScriptToStringable {
  toString: () => string
}

interface CSPTrustedScriptUrlToStringable {
  toString: () => string
}

interface CSPTrustedTypesPolicy {
  createHTML: (s: string, r: Response) => CSPTrustedHTMLToStringable
  createScript: (s: string) => CSPTrustedScriptToStringable
  createScriptURL: (s: string) => CSPTrustedScriptUrlToStringable
}

interface TrustedTypesPolicyInterface {
  emptyHTML: string
}

let CSPTrustedTypesPolicy: CSPTrustedTypesPolicy | null = null

export function setCSPTrustedTypesPolicy(policy: CSPTrustedTypesPolicy) {
  CSPTrustedTypesPolicy = policy
}

type GlobalThis = typeof globalThis
interface TrustedTypesGlobalThis extends GlobalThis {
  trustedTypes?: TrustedTypesPolicyInterface
}

export const emptyHTML = (globalThis as TrustedTypesGlobalThis).trustedTypes?.emptyHTML ?? ""

export { CSPTrustedTypesPolicy }
