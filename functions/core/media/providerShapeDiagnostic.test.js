import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectWorkflowShape} from './providerShapeDiagnostic.js';
test('redacts URLs and preserves only field types',()=>{
 const secret='https://media.sognistorage.com/private?token=confidential';
 const shape=inspectWorkflowShape({steps:[{artifacts:[{url:secret,mimeType:'image/png',sizeBytes:100}]}]});
 assert.equal(shape.steps[0].examples[0].fields.url,'string');
 assert.equal(shape.steps[0].examples[0].fields.sizeBytes,'number');
 assert.equal(JSON.stringify(shape).includes(secret),false);
});
test('handles unexpected workflow shapes',()=>{
 assert.deepEqual(inspectWorkflowShape(null),{stepCount:0,steps:[]});
});
