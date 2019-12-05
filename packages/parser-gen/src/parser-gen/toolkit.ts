import rootDebug from "debug";
import { isIterable } from "@/common/shim";
let debug = rootDebug("APP:pg:toolkit");

export class CyclicDepsDector<T> {
	private dependencies = new Map<T, Set<T>>();
	/**
     * 广度优先遍历图,如果找到 startPoint到endPoint的路径,则说明存在循环依赖  issue: 9.循环依赖
     * @param endPoint
     * @param startPoint
     */
	private existsCycl(endPoint: T, startPoint: T) {
		let otherDeps = this.dependencies.get(startPoint);
		if (otherDeps === undefined)
			return false;
		if (otherDeps.has(endPoint)) {
			return true;
		}
		let stack = Array.from(otherDeps);
		let visited = new Set<T>(); //标记无向图中已经被遍历过的节点
		while (stack.length > 0) {
			let top = stack.pop() as T;
			visited.add(top);
			debug(`visited ${top}`);
			if (top == endPoint)
				return true;
			let topDeps = this.dependencies.get(top);
			if (topDeps == undefined)
				continue;
			if (topDeps.has(endPoint))
				return true;
			for (let topDep of topDeps) {
				stack.push(topDep);
			}
		}
		return false;
	}
	registerAndCheckCycl(holder: T, dep: T) {
		let holderDeps = this.dependencies.get(holder);
		if (holderDeps === undefined) {
			holderDeps = new Set<T>();
			this.dependencies.set(holder, holderDeps);
		}
		holderDeps.add(dep);
		return this.existsCycl(holder, dep);
	}
}


export class MismatchError extends Error {
	constructor(expected: Object, actual: Object) {
		let err_msg;
		if (isIterable(expected)) {
			let expectation = "";
			for (let e of expected) {
				expectation += e + ",";
			}
			expectation = expectation.replace(/,$/, "");
			err_msg = `The expected input is one of ${expectation},but actually ${actual}`;
		}
		else {
			err_msg = `The expected input is ${expected},but actually ${actual}`;
		}
		super(err_msg);
	}
}
