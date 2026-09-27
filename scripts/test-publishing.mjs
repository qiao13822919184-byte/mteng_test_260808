import assert from 'node:assert/strict';
import {isPublished,canonicalPath,publicDocument,safeJson} from '../src/lib/publishing.ts';
const now=new Date('2026-09-27T04:00:00Z');
assert.equal(isPublished({data:{draft:true,status:'published'}},now),false);
assert.equal(isPublished({data:{draft:false,status:'approved'}},now),false);
assert.equal(isPublished({data:{status:'draft'}},now),false);
assert.equal(isPublished({data:{status:'published',publishAt:'2026-09-28T00:00:00Z'}},now),false);
assert.equal(isPublished({data:{status:'published',publishAt:'2026-09-27T04:00:00Z'}},now),true);
assert.equal(isPublished({data:{status:'published',date:'2026-09-28'}},now),false);
assert.equal(isPublished({data:{status:'published',publishAt:'invalid'}},now),false);
assert.equal(isPublished({data:{}},now),true); // Existing Chinese entries remain published.
assert.equal(canonicalPath('/en/products'),'/en/products/');
assert.equal(canonicalPath('/'),'/');
assert.equal(publicDocument({visibility:'internal',status:'current',number:'test',date:'2026-01-01',scope:'test',url:'https://example.com'}),false);
assert.equal(publicDocument({visibility:'public',status:'archived',number:'test',date:'2026-01-01',scope:'test',url:'https://example.com'}),false);
assert.equal(publicDocument({visibility:'public',status:'current',number:'test',date:'2020-01-01',expiry:'2020-12-31',scope:'test',url:'https://example.com'}),false);
assert(!safeJson({text:'</script><script>alert(1)</script>'}).includes('<'));
console.log('PASS: draft, approval, scheduling, legacy content, document visibility and JSON escaping.');
