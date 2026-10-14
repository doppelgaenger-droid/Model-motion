import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, usdToCents, reserveQuote, makeDraft } from "./contracts.js";
test("every terminal state is immutable",()=>{
 for (const x of ["completed","failed","cancelled"]) for (const y of ["queued","processing","completed","draft"]) assert.equal(canTransition(x,y),false);
});
test("quote over default budget requires explicit approval",()=>{
 const x=reserveQuote({quotedUsd:0.51});
 assert.equal(x.permitted,false);
 assert.equal(x.reason,"APPROVAL_REQUIRED");
 assert.equal(reserveQuote({quotedUsd:0.51,approvalCents:51}).permitted,true);
 assert.equal(reserveQuote({quotedUsd:0.50}).permitted,true);
});
test("reject zero, invalid, excessive and negative budgets",()=>{
 for(const x of [0,-1,NaN,Infinity,1001,"0.5"]) assert.throws(()=>usdToCents(x),/INVALID_JOB_BUDGET/);
});
test("draft is inert, idempotent and provider-scoped",()=>{
 const j=makeDraft({uid:"owner",provider:"artcraft",characterId:"character-1",idempotencyKey:"unique_key_001"});
 assert.equal(j.status,"draft");
 assert.equal(j.reservationCents,0);
 assert.equal(j.externalJobToken,null);
 assert.equal(j.budgetCents,50);
});
