import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFieldCommit,committedFieldValue} from '../src/field-commit.js';

class Field extends EventTarget {
  value='0.42';
  focus(){this.dispatchEvent(new Event('focus'));}
  blur(){this.dispatchEvent(new Event('blur'));}
  key(key,isComposing=false){
    const event=Object.assign(new Event('keydown',{cancelable:true}),{key,isComposing});
    this.dispatchEvent(event);
    return event.defaultPrevented;
  }
  adjust(value){
    this.value=value;
    this.dispatchEvent(new Event('input'));
    this.dispatchEvent(new Event('change'));
  }
}

test('several spinner changes stay draft until focus leaves and commit once',()=>{
  const field=new Field(),changes=[];
  bindFieldCommit(field,before=>changes.push([before,committedFieldValue(field)]));
  field.focus();
  for(const value of ['0.43','0.44','0.45'])field.adjust(value);
  assert.equal(committedFieldValue(field),'0.42');
  assert.deepEqual(changes,[]);
  field.blur();
  field.blur();
  assert.deepEqual(changes,[['0.42','0.45']]);
  field.focus();
  field.blur();
  assert.equal(changes.length,1);
});

test('Enter commits once and an Enter during IME composition does not commit',()=>{
  const field=new Field(),changes=[];
  bindFieldCommit(field,()=>changes.push(committedFieldValue(field)));
  field.focus();
  field.adjust('0.55');
  assert.equal(field.key('Enter',true),false);
  assert.deepEqual(changes,[]);
  assert.equal(field.key('Enter'),true);
  assert.deepEqual(changes,['0.55']);
});
