/* Vanilla JS api is shit */

export interface IFunction<I, R> {
	(i: I): R
}

export class Stack<T> implements Iterable<T>{
	*[Symbol.iterator](): Iterator<T, any, undefined> {
		for (let e of this.arr) {
			yield e;
		}
	}
	private arr: Array<T>;
	constructor(...items: T[]) {
		this.arr = new Array<T>(...items);
	}
	peek(): T {
		return this.arr[this.arr.length - 1];
	}
	push(...t: T[]) {
		this.arr.push(...t);
	}
	pop() {
		return this.arr.pop();
	}
	batchPop(i: number) {
		assert(i > 0 && i <= this.arr.length);
		let result = [];
		for (; i > 0; i--) {
			result.push(this.pop());
		}
		return result;
	}
	size() {
		return this.arr.length;
	}
	join(separator?: string): string {
		return this.arr.join(separator);
	}
	
}

export class Queue<T> implements Iterable<T>{
	[Symbol.iterator](): Iterator<T, any, undefined> {
		let i = 0;
		let arr = this.arr;
		return {
			next: function () {
				return i < arr.length ?
					{ value: arr[i++], done: false } :
					{ value: null, done: true };
			}
		};
	}
	private arr: Array<T>
	constructor(...items: T[]) {
		this.arr = new Array<T>(...items);
	}

	get(i: number): T | undefined {
		return this.arr[i];
	}
	peekFirst(): T | undefined {
		return this.arr[0];
	}
	peekLast(): T | undefined {
		return this.arr[this.arr.length - 1];
	}
	addFirst(element: T) {
		this.arr.unshift(element);
	}
	addLast(element: T) {
		this.arr.push(element);
	}
	removeLast(): T | undefined {
		return this.arr.pop();
	}
	removeFirst(): T | undefined {
		return this.arr.shift();
	}
	size(): number {
		return this.arr.length;
	}
}

export function addAll_Map(to: Map<any, any>, from: Map<any, any>) {
	for (let [k, v] of from)
		to.set(k, v);
	return to;
}
export function addAll_Set(to: Set<any>, from: Set<any>) {
	for (let v of from) {
		to.add(v);
	}
	return to;
}
export function isIterable(obj: any): obj is Iterable<any> {
	if (obj == null)
		return false;
	return typeof obj[Symbol.iterator] === "function";
}

export function assert(condition: boolean, msg?: string): asserts condition {
	if (!condition) {
		throw new Error(`Assert Error: ${msg}`);
	}
}
