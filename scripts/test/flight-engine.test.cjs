'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile, limits } = require('../../protection/assets/flight-engine.js');
const cmd = (op, amount) => ({ op, amount });
const pose = (x, y, heading) => ({ x, y, heading });

test('flight program preserves instruction order, with one pose per step and independent runs', () => {
  const steps = Object.freeze([cmd('forward',3), cmd('left',90), cmd('back',2), cmd('right',180), cmd('forward',4)].map(Object.freeze));
  const plan = compile(steps);
  assert.deepEqual(plan, {ok:true, error:null, states:[
    pose(0,0,0), pose(0,3,0), pose(0,3,270), pose(2,3,270), pose(2,3,90), pose(6,3,90)
  ]});
  assert.deepEqual(compile([cmd('right',270),cmd('forward',2)]).states.at(-1), pose(-2,0,270));
  assert.deepEqual(compile([cmd('forward',2),cmd('right',270)]).states.at(-1), pose(0,2,270));
  assert.deepEqual(compile([cmd('left',270),cmd('right',270)]).states.at(-1), pose(0,0,0));
});

test('each map edge is reachable; one cell farther identifies the bad row without wrapping or clipping', () => {
  for (const [direction,x,y] of [[0,0,10],[90,10,0],[180,0,-10],[270,-10,0]]) {
    const turn = direction ? [cmd('right', direction)] : [];
    const edge = [...turn, cmd('forward',limits.bound)];
    const valid = compile(edge);
    assert.deepEqual(valid.states.at(-1), pose(x,y,direction));
    const invalid = compile([...edge, cmd('forward',1), cmd('back',1)]);
    assert.deepEqual(invalid.error, {code:'bounds',index:edge.length});
    assert.deepEqual(invalid.states, valid.states);
  }
});

test('invalid blocks fail at their own row, without numerical coercion or running the rest', () => {
  for (const [bad,code] of [
    [null,'op'],[{},'op'],[cmd('land',1),'op'],
    [cmd('left',45),'amount'],[cmd('right',360),'amount'],[cmd('right','90'),'amount'],
    [cmd('forward',0),'amount'],[cmd('back',-1),'amount'],[cmd('back',1.2),'amount'],
    [cmd('forward',11),'amount'],[cmd('forward',NaN),'amount'],[cmd('forward','1'),'amount']
  ]) {
    const route=compile([cmd('back',2),bad,cmd('right',90)]);
    assert.equal(route.ok,false); assert.deepEqual(route.error,{code,index:1});
    assert.deepEqual(route.states,[pose(0,0,0),pose(0,-2,0)]);
  }
  assert.deepEqual(compile([]).error, {code:'empty',index:0});
  assert.deepEqual(compile(null).error, {code:'empty',index:0});
  const maximum=Array.from({length:limits.maxCommands},()=>cmd('right',90));
  assert.equal(compile(maximum).states.length, limits.maxCommands+1);
  assert.deepEqual(compile([...maximum,cmd('right',90)]).error,{code:'limit',index:limits.maxCommands});
});
