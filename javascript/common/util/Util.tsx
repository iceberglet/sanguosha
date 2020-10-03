import * as React from 'react'

export function shuffle<T>(array: T[]): T[] {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

export function getRandom<T>(array: T[]): T {
    let idx = Math.floor(Math.random() * array.length)
    if(idx >= array.length) {
      idx = array.length - 1
    }
    return array[idx]
}

export function takeFromArray<T>(array: T[], matcher: (t: T)=>boolean): T {
  let c = array.findIndex(matcher)
  if(c !== -1) {
      return array.splice(c, 1)[0]
  }
}

export function enumValues(obj: any): string[] {
  return Object.keys(obj).filter(k => typeof(obj[k]) === 'number')
}

export function getNext<T>(arr: T[], curr: number): T {
  return arr[(curr+1)%arr.length]
}

export type EventCall<T> = (t: T)=>void

export const Suits = {
  heart: '\u2665',
  spade: '\u2660',
  diamond: '\u2666',
  club: '\u2663',
  none: 'ERROR'
}

export function Mask(prop: {isMasked: boolean, maskClass?: string}) {
  if(prop.isMasked) {
    return <div className={`occupy ${prop.maskClass || 'mask'}`}/>
  }
  return null
}

export function checkNotNull(obj: any) {
  if(obj === null || obj === undefined) {
    throw 'null value'
  }
}

export function checkThat(cond: boolean, msg: string = 'Condition failed') {
  if(!cond) {
    throw msg
  }
}

export function getKeys<K>(map: Map<K, any>): K[] {
  let res: K[] = []
  for(let k of map.keys()) {
    res.push(k)
  }
  return res
}

export function flattenMap<K, V>(map: Map<K, V>): Array<[K, V]> {
  let res: Array<[K, V]> = []
  map.forEach((v, k) => {
      res.push([k, v])
  })
  return res
}

export function filterMap<K, V>(map: Map<K, V>, filter: (k: K, v: V)=>boolean): Array<[K, V]> {
    return flattenMap(map).filter(kv => filter(kv[0], kv[1]))
}

export function all<T>(arr: Iterable<T>, predicate: (t: T)=>boolean) {
    for(let t of arr) {
      if(!predicate(t)) {
        return false
      }
    }
    return true
}

export function any<T>(arr: Iterable<T>, predicate: (t: T)=>boolean) {
  for(let t of arr) {
    if(predicate(t)) {
      return true
    }
  }
  return false
}

/**
 * move item from fromIdx to toIdx
 * @param list list
 * @param fromIdx 
 * @param toIdx 
 */
export function reorder<T>(list: Array<T>, fromIdx: number, toIdx: number): Array<T> {
    const [removed] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, removed);
    return list
};

export function promiseAny<T>(iterable: Iterable<T | PromiseLike<T>>): Promise<T> {
  return Promise.all(
    [...iterable].map(promise => {
      return new Promise((resolve, reject) =>
        Promise.resolve(promise).then(reject, resolve)
      );
    })
  ).then(
    errors => Promise.reject(errors),
    value => Promise.resolve<T>(value)
  );
};


const chinese = ['一', '二', '三', '四', '五', '六', '七', '八']
export function toChinese(idx: number) {
    if(idx < chinese.length) {
      return chinese[idx]
    } else {
      throw `Donno this ${idx}`
    }
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
export function wait(fn: Function, ms: number = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      fn();
      resolve();
    }, ms);
  });
}

export function throttle(func: Function, wait: number) {
  let canExecute = true
  return function() {
    if(canExecute) {
      canExecute = false
      func.apply(this, arguments)
      setTimeout(()=>{
        canExecute = true
      }, wait)
    }
  }
}
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
export function debounce(func: Function, wait: number, immediate: boolean = false) {
	var timeout: any;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};