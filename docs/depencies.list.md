```json
	{
		"dependencies": {
			"debug": "^4.1.1",
			"lodash": "^4.17.15",
			/* 模块路径别名(用于编译后的js文件,使用package.json中的path alias做映射)*/
			"module-alias": "^2.2.2"
		},
		"devDependencies": {

			"@babel/cli": "^7.7.4",
			"@babel/core": "^7.7.4",
			"@babel/node": "^7.7.4",

			/* babel支持typescript */
			"@babel/preset-typescript": "^7.7.4",
			/* babel支持esnext */
			"@babel/plugin-proposal-class-properties": "^7.4.0",
			"@babel/plugin-proposal-numeric-separator": "^7.2.0",
			"@babel/plugin-proposal-object-rest-spread": "^7.4.0",
			"@babel/preset-env": "^7.7.4",

			"eslint": "^6.7.1",
			/* eslint支持typescript */
			"@typescript-eslint/eslint-plugin": "^2.9.0",
			"@typescript-eslint/parser": "^2.9.0",

			/* 环境变量 */
			"cross-env": "^6.0.3",

			/* commit hook(暂时没用) */
			"pre-commit": "^1.2.2",

			/* 模块路径别名(使用babel-node本地调试时,其使用tsconfig.json中配置path alias做映射) */
			/* 使用babel-node本地调试时,根据tsconfig.json路径 */
			"tsconfig-paths": "^3.9.0",

			"mocha": "^6.2.2",
			"should": "^13.2.3",
			"ts-node": "^8.4.1",
			"typescript": "^3.7.2",

			/* d.ts */
			"@types/debug": "^4.1.5",
			"@types/lodash": "^4.14.144",
			"@types/mocha": "^5.2.7",
			"@types/node": "^12.11.6",
		}
	}
	```