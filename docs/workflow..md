1. Run tests (if there are any)
2. Update version in package.json according to Semver
3. Create a git tag according to Semver
4. Push the package to Github
5. Push the package to npm
6. Create release notes for every update

https://zellwk.com/blog/publish-to-npm/

lerna publish

```
 -  Run the equivalent of  `lerna updated`  to determine which packages need to be published.
 -  If necessary, increment the  `version`  key in  `lerna.json`.
 -  Update the  `package.json`  of all updated packages to their new versions.
 -  Update all dependencies of the updated packages with the new versions, specified with a  [caret (^)](https://docs.npmjs.com/files/package.json#dependencies).
 -  Create a new git commit and tag for the new version.
 -  Publish updated packages to npm.
```