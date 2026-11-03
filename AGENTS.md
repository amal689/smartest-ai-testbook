# Language rule

Use English throughout the entire project, including specifications, documentation, code, comments, user-facing text, configuration descriptions, and this file.

# Design rule

This project is a school exercise in object-oriented programming. Every TypeScript class must explicitly declare that it implements one or more interfaces exposing its public contract, even when there is only one implementation.

Python domain classes must explicitly declare and implement one or more public contracts using `Protocol`, even when there is only one implementation. Test support classes and data types are not domain classes.

Domain code under `typescript/src/` and `python/src/`, excluding `web-server/` and `web_server/`, must implement the object-oriented architecture described in the project documentation, including its responsibilities, collaborations and public contracts. Apply maximum simplicity within that architecture.

# Implementation rule

Implement every feature in both TypeScript and Python, sequentially rather than simultaneously. Both implementations must provide the same set of functions and share the same basic architecture and logic. Only minimal implementation details required by the language may differ; logical discrepancies are not allowed.

# Simplicity rule

Always write the smallest clear implementation that fully satisfies the requirements, follows the documented domain architecture and is easy to explain in class. Conciseness must come from removing unnecessary work, not from clever syntax or hiding intent.

Within the documented domain architecture, use only the classes, abstractions and files needed to express its responsibilities and contracts clearly. For supporting code, prefer direct functions and standard library or framework features whenever they are sufficient. Do not add structure for hypothetical future needs. The public-contract rules above apply to all classes within their stated scope.

Keep supporting code, especially HTTP servers and startup glue, minimal so it does not distract from the domain model. Avoid forwarding-only wrappers and checks that merely duplicate behavior already handled by the runtime or framework, such as custom validation of trusted startup configuration. Leave unspecified technical behavior to framework defaults. Preserve validation of untrusted input, necessary error handling, security, data integrity and all explicitly required behavior.
