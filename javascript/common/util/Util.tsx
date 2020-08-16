import * as React from 'react'

export function shuffle<T>(array: T[]): T[] {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
}

export function takeFromArray<T>(array: T[], matcher: (t: T)=>boolean): T {
  let c = array.findIndex(matcher)
  if(c != -1) {
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

export function getKeys<K>(map: Map<K, any>): K[] {
  let res: K[] = []
  for(let k of map.keys()) {
    res.push(k)
  }
  return res
}

export function filterMap<K, V>(map: Map<K, V>, filter: (k: K, v: V)=>boolean): Array<[K, V]> {
    let res: Array<[K, V]> = []
    map.forEach((v, k) => {
      if(filter(k, v)) {
        res.push([k, v])
      }
    })
    return res
}

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