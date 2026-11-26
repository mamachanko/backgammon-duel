'use strict';
const el = id => document.getElementById(id);
const roll = [3, 1];
const initial = Array(25).fill(0);
for (const [point, count] of [[24,2],[13,5],[8,3],[6,5]]) {
  initial[point] = count;
  initial[25-point] = -count;
}
let position, history, selected, quadrant, enlarged, scores;
function resetTurn() {
  position = initial.slice();
  history = [];
  selected = null;
  enlarged = false;
  quadrant = 0;
}
function remaining() {
  return roll.filter(die => !history.some(step => step.die === die));
}
function destinations(point) {
  if (!point || position[point] <= 0) return [];
  return remaining().map(die => point-die).filter(to => to > 0 && position[to] >= -1);
}
function activate(point) {
  if (destinations(selected).includes(point)) {
    history.push({from:selected, to:point, die:selected-point, before:position.slice()});
    position[selected]--;
    position[point] = Math.max(0, position[point])+1;
    selected = null;
  } else if (selected === point) selected = null;
  else if (destinations(point).length) selected = point;
  render();
}
function pointButton(point, column, row) {
  const button = document.createElement('button');
  const count = position[point];
  const legal = destinations(selected).includes(point);
  button.className = ['point',row === 2 ? 'bottom' : '',point === selected ? 'selected' : '',legal ? 'legal' : ''].join(' ');
  button.style.gridColumn = column;
  button.style.gridRow = enlarged ? 1 : row;
  button.style.setProperty('--point',point%2 ? '#bd805d' : '#568174');
  button.dataset.point = point;
  button.setAttribute('aria-label', 'Point '+point+', '+(count ? Math.abs(count)+(count>0?' charcoal':' ivory') : 'empty')+(legal?', legal landing point':''));
  button.setAttribute('aria-pressed',String(selected===point));
  const stack = document.createElement('span');
  stack.className = 'pieces';
  for (let i=0; i<Math.min(5,Math.abs(count)); i++) {
    const checker = document.createElement('span');
    checker.className = 'checker'+(count<0?' ivory':'');
    stack.append(checker);
  }
  const label = document.createElement('span');
  label.className = 'num';
  label.textContent = point+(Math.abs(count)>5?' · ×'+Math.abs(count):'');
  button.append(stack,label);
  return button;
}
function drawBoard() {
  const board = el('board');
  board.replaceChildren();
  board.classList.toggle('close',enlarged);
  for (let point=1;point<=24;point++) {
    if (enlarged && Math.floor((point-1)/6)!==quadrant) continue;
    const index = point<=12 ? 12-point : point-13;
    board.append(pointButton(point,enlarged ? index%6+1 : index+1+Number(index>=6),point<=12?2:1));
  }
  if (!enlarged) {
    const bar=document.createElement('span');
    bar.className='bar';
    board.append(bar);
  }
  el('zoom').textContent=enlarged?'Show full board':'Enlarge board';
  el('quarters').hidden=!enlarged;
  Array.from(el('quarters').children).forEach((button,i)=>button.setAttribute('aria-pressed',String(i===quadrant)));
}
function render() {
  const left=remaining();
  drawBoard();
  el('dice').replaceChildren();
  for (const value of roll) {
    const die=document.createElement('span');
    die.className='die'+(left.includes(value)?'':' spent');
    for (const slot of value===3?[1,5,9]:[5]) {
      const pip=document.createElement('i');
      pip.className='pip';
      pip.style.gridArea=Math.ceil(slot/3)+' / '+((slot-1)%3+1);
      die.append(pip);
    }
    el('dice').append(die);
  }
  el('prompt').textContent=selected ? 'From '+selected+' · Tap point '+destinations(selected).join(' or ')+'.' : left.length?'Tap a charcoal checker, then its landing point.':'Both dice played. Submit when you’re ready.';
  el('moves').textContent=history.map(s=>s.from+'/'+s.to).join('   ');
  el('mode').disabled=history.length>0 || scores.length>0;
  el('undo').disabled=!history.length;
  el('submit').disabled=left.length!==0;
  el('turn').textContent=scores.length?'Mum’s turn':'Your turn';
  document.querySelector('#play h1').textContent=scores.length?'Mum’s move':'Your move';
}
el('board').onclick=e=>{
  const button=e.target.closest('[data-point]');
  if (!button) return;
  activate(Number(button.dataset.point));
  el('board').querySelector('[data-point="'+button.dataset.point+'"]').focus({preventScroll:true});
};
let drag=null, suppressClick=false;
el('board').addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-point]');
  suppressClick=false;
  if (!button || !destinations(Number(button.dataset.point)).length) return;
  drag={from:Number(button.dataset.point),x:e.clientX,y:e.clientY};
});
window.addEventListener('pointercancel',()=>{drag=null;});
window.addEventListener('pointerup',e=>{
  if (!drag) return;
  const {from,x,y}=drag;
  drag=null;
  if (Math.hypot(e.clientX-x,e.clientY-y)<8) return;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-point]');
  suppressClick=true;
  selected=from;
  if (target && destinations(from).includes(Number(target.dataset.point))) activate(Number(target.dataset.point));
  else render();
});
el('board').addEventListener('click',e=>{if(suppressClick){e.stopImmediatePropagation();suppressClick=false;}},true);
el('zoom').onclick=()=>{enlarged=!enlarged;drawBoard();};
for (let i=0;i<4;i++) {
  const button=document.createElement('button');
  button.textContent=(6*i+1)+'–'+(6*i+6);
  button.onclick=()=>{quadrant=i;drawBoard();};
  el('quarters').append(button);
}
el('undo').onclick=()=>{position=history.pop().before;selected=null;render();};
function screen(id) {
  for (const name of ['play','pass','review']) el(name).hidden=name!==id;
  window.scrollTo(0,0);
  const heading=el(id).querySelector('h1');
  heading.tabIndex=-1;
  heading.focus();
}
el('submit').onclick=()=>{
  if (remaining().length) return;
  scores.push({points:Number(position[5]===2),moves:el('moves').textContent});
  if (scores.length<Number(el('mode').value)) {screen('pass');return;}
  const [you,mum]=scores;
  el('result').textContent=mum ? (you.points===mum.points?'A draw':you.points?'You win':'Mum wins') : (you.points?'You made the 5-point':'Round reviewed');
  el('scores').replaceChildren();
  scores.forEach((score,i)=>{
    const line=document.createElement('p');
    line.className='score';
    line.textContent=(i?'Mum':'You')+' · '+score.moves+' · '+score.points+' / 1';
    el('scores').append(line);
  });
  screen('review');
};
el('ready').onclick=()=>{resetTurn();render();screen('play');};
function start(){scores=[];resetTurn();render();screen('play');}
el('again').onclick=start;
start();
