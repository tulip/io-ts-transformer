"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var path = __importStar(require("path"));
var decoderFunctionName = 'buildDecoder';
var fromIoTsTypeName = 'FromIoTs';
var ioTsPaths = [
    getRealPath('../io-ts/lib/index.js'),
    getRealPath('../io-ts/es6/index.js'),
    getRealPath('node_modules/io-ts/es6/index.js'),
    getRealPath('node_modules/io-ts/lib/index.js')
];
var isIoTsImport = isImportDeclarationWithOneOfPaths(ioTsPaths);
var indexJsPath = getRealPath('index.js');
var isIndexJsImport = isImportDeclarationWithOneOfPaths([indexJsPath]);
var indexTsPath = getRealPath('index.d.ts');
function transform(program) {
    console.log("[io-ts-transformer info]: If you will get any problems using this transformer, please\n  leave an issue on GitHub https://github.com/awerlogus/io-ts-transformer/issues with your types example");
    return function (context) { return function (file) {
        if (!getDirectChildren(file).some(isIndexJsImport))
            return file;
        var typeChecker = program.getTypeChecker();
        if (someOfNodeOrChildren(isWrongTransformFunctionUsage(typeChecker, decoderFunctionName, indexTsPath))(file))
            throw new Error(decoderFunctionName + " function should used as a call expression only");
        if (someOfNodeOrChildren(isNamespaceUsedNotAsPropAccess(typeChecker, indexTsPath))(file))
            throw new Error("io-ts-transformer namespace alias used not to access it's property");
        if (!someOfNodeOrChildren(isFunctionCallExpression(decoderFunctionName, indexTsPath)(typeChecker)))
            return file;
        var ioTsPriorName = getIoTsAliasName(file);
        var ioTsAliasName = ioTsPriorName !== null && ioTsPriorName !== void 0 ? ioTsPriorName : findFreeName(isNameFree(file), 'io');
        var replaceIndexNode = function () {
            var replacer = getSingleNodeReplacer(isIndexJsImport, createNamespaceImportDeclaration(ioTsAliasName, 'io-ts'));
            return ts.visitEachChild(file, function (node) { return replacer(node, program); }, context);
        };
        var file1 = ioTsPriorName === undefined ? replaceIndexNode() : file;
        var fromIoTsUsages = findFromIoTsUsages(file, typeChecker);
        return mapNodeAndChildren(file1, program, context, getNodeVisitor(ioTsAliasName, fromIoTsUsages, context));
    }; };
}
exports.default = transform;
function mapNodeAndChildren(node, program, context, mapper) {
    var visitor = function (childNode) { return mapNodeAndChildren(childNode, program, context, mapper); };
    return ts.visitEachChild(mapper(node, program), visitor, context);
}
function getAliasedSymbol(symbol, typeChecker) {
    try {
        return typeChecker.getAliasedSymbol(symbol);
    }
    catch (_) {
        return symbol;
    }
}
function getAliasedSymbolOfNode(node, typeChecker) {
    var symbol = typeChecker.getSymbolAtLocation(node);
    if (symbol === undefined)
        return undefined;
    return getAliasedSymbol(symbol, typeChecker);
}
function isSymbolOf(symbol, name, filePath) {
    if (symbol.escapedName !== name)
        return false;
    return __spread([symbol.valueDeclaration], symbol.declarations).filter(Boolean)
        .some(function (declaration) { return path.join(declaration.getSourceFile().fileName) === filePath; });
}
function isAliasIdentifierOf(node, typeChecker, name, filePath) {
    var symbol = getAliasedSymbolOfNode(node, typeChecker);
    return symbol !== undefined && isSymbolOf(symbol, name, filePath);
}
function isWrongTransformFunctionUsage(typeChecker, functionName, filePath) {
    return function (node) {
        if (!ts.isIdentifier(node) || ts.isImportSpecifier(node.parent))
            return false;
        if (ts.isCallExpression(node.parent) && !node.parent.arguments.includes(node))
            return false;
        if (!ts.isPropertyAccessExpression(node.parent))
            return isAliasIdentifierOf(node, typeChecker, functionName, filePath);
        var expression = node.parent.expression;
        if (!ts.isIdentifier(expression))
            return false;
        if (isAliasIdentifierOf(expression, typeChecker, functionName, filePath))
            return true;
        var name = node.parent.name;
        if (!ts.isIdentifier(name))
            return false;
        if (!isAliasIdentifierOf(name, typeChecker, functionName, filePath))
            return false;
        return !ts.isCallExpression(node.parent.parent) || node.parent.parent.arguments.includes(node.parent);
    };
}
function isNamespaceUsedNotAsPropAccess(typeChecker, filePath) {
    return function (node) {
        if (!ts.isIdentifier(node))
            return false;
        if (ts.isPropertyAccessOrQualifiedName(node.parent))
            return false;
        if (ts.isNamespaceImport(node.parent))
            return false;
        var symbol = getAliasedSymbolOfNode(node, typeChecker);
        var declaration = symbol === null || symbol === void 0 ? void 0 : symbol.valueDeclaration;
        if (declaration === undefined || !ts.isSourceFile(declaration))
            return false;
        return path.join(declaration.fileName) === filePath;
    };
}
function findFromIoTsUsages(file, typeChecker) {
    var handleNode = function (node) {
        var _a;
        if (ts.isImportSpecifier(node.parent))
            return {};
        var symbol = getAliasedSymbolOfNode(node, typeChecker);
        if (symbol === undefined || !isSymbolOf(symbol, fromIoTsTypeName, indexTsPath))
            return {};
        var parent = ts.isPropertyAccessOrQualifiedName(node.parent) ? node.parent.parent : node.parent;
        var args = parent.typeArguments[0]._children;
        if (args[0].kind !== ts.SyntaxKind.TypeOfKeyword)
            throw new Error(fromIoTsTypeName + " type must be used with 'typeof' parameter only");
        if (!ts.isIdentifier(args[1]))
            throw new Error(fromIoTsTypeName + " type can accept typeof identifier only");
        var type = typeChecker.getTypeFromTypeNode(parent);
        return _a = {}, _a[getTypeId(type)] = String(args[1].escapedText), _a;
    };
    var visitor = function (node) {
        var nodeResult = ts.isIdentifier(node) ? handleNode(node) : {};
        var childrenResult = node.getChildren().map(visitor);
        return __spread([nodeResult], childrenResult).reduce(mergeObjects);
    };
    return visitor(file);
}
function getDirectChildren(node) {
    var children = node.getChildren();
    if (!ts.isSourceFile(node))
        return children;
    if (children.length === 0)
        return [];
    return children[0].getChildren();
}
function someOfNodeOrChildren(predicate) {
    return function (node) {
        if (predicate(node))
            return true;
        return node
            .getChildren()
            .some(someOfNodeOrChildren(predicate));
    };
}
function getImportNodeRealPath(node) {
    var e_1, _a, e_2, _b;
    var module = node.moduleSpecifier.text;
    var nodePath = module.startsWith('.')
        ? path.resolve(path.dirname(node.getSourceFile().fileName), module)
        : module;
    try {
        return require.resolve(nodePath);
    }
    catch (e) {
        try {
            for (var _c = __values(['ts', 'tsx']), _d = _c.next(); !_d.done; _d = _c.next()) {
                var extension = _d.value;
                try {
                    return require.resolve(nodePath + "." + extension);
                }
                catch (e) { }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (e.path) {
            try {
                var packageJSONPath = e.path;
                var packageJSON = require(packageJSONPath);
                if (packageJSON && packageJSON.main) {
                    try {
                        for (var _e = __values(["js", "jsx", "ts", "tsx"]), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var extension = _f.value;
                            return require.resolve(packageJSON.main + "." + extension, {
                                paths: [path.dirname(packageJSONPath)],
                            });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e) { }
        }
        throw e;
    }
}
function isImportDeclarationWithOneOfPaths(paths) {
    return function (node) {
        return ts.isImportDeclaration(node) && paths.includes(getImportNodeRealPath(node));
    };
}
function getRealPath(filePath) {
    return path.join(__dirname, filePath);
}
function isFunctionCallExpression(functionName, declarationFilePath) {
    return function (typeChecker) { return function (node) {
        if (!ts.isCallExpression(node))
            return false;
        var signature = typeChecker.getResolvedSignature(node);
        var declaration = signature === null || signature === void 0 ? void 0 : signature.declaration;
        return declaration !== undefined
            && !ts.isJSDocSignature(declaration)
            && declaration.name !== undefined
            && declaration.name.getText() === functionName
            && (path.join(declaration.getSourceFile().fileName) === declarationFilePath);
    }; };
}
function isNameFree(file) {
    return function (name) {
        return !someOfNodeOrChildren(function (node) {
            return ts.isIdentifier(node)
                && node.getText() === name
                && !ts.isPropertyAccessExpression(node.parent)
                && !ts.isPropertySignature(node.parent)
                && !ts.isPropertyAssignment(node.parent);
        })(file);
    };
}
function isNumberString(string) {
    return string.match(/^\d+$/) !== null;
}
function getLastSymbol(string) {
    var length = string.length;
    return length !== 0 ? string[length - 1] : '';
}
function findFreeName(isNameFree, template) {
    var defaultName = template
        .replace('_@_', '_')
        .replace(/_@$/, '')
        .replace('@', '');
    if (isNameFree(defaultName))
        return defaultName;
    var buildName = function (index) {
        if (template.includes('@'))
            return template.replace('@', index.toString());
        if (isNumberString(getLastSymbol(template)))
            return template + '_' + index.toString();
        return template + index.toString();
    };
    var nextIteration = function (index) {
        var name = buildName(index);
        if (isNameFree(name))
            return name;
        return nextIteration(index + 1);
    };
    return nextIteration(0);
}
function getNamespaceImportAliasName(node) {
    var _a;
    var bindings = (_a = node.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings;
    if (bindings === undefined || !ts.isNamespaceImport(bindings))
        return undefined;
    return bindings.getChildAt(2).getText();
}
function getIoTsAliasName(file) {
    var name = getDirectChildren(file)
        .filter(isIoTsImport)
        .map(getNamespaceImportAliasName)
        .find(Boolean);
    if (name === undefined)
        return undefined;
    return someOfNodeOrChildren(function (node) { return ts.isIdentifier(node)
        && !ts.isNamespaceImport(node.parent)
        && node.getText() === name; })(file) ? name : undefined;
}
function createNamespaceImportDeclaration(aliasName, namespaceName) {
    return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(aliasName))), ts.createStringLiteral(namespaceName));
}
function getSingleNodeReplacer(predicate, replacement) {
    var replaced = false;
    return function (node) {
        if (replaced || !predicate(node))
            return node;
        replaced = true;
        return replacement;
    };
}
function createPropertyAccess(objectName, propertyName) {
    return ts.createPropertyAccess(ts.createIdentifier(objectName), ts.createIdentifier(propertyName));
}
function createMethodCall(objectName, methodName, params) {
    return ts.createCall(createPropertyAccess(objectName, methodName), undefined, params);
}
function isTupleType(type, typeChecker) {
    return typeChecker.isTupleType(type);
}
function isArrayType(type, typeChecker) {
    return typeChecker.isArrayType(type);
}
function isRecordType(type) {
    var _a;
    return ((_a = type.aliasSymbol) === null || _a === void 0 ? void 0 : _a.getName()) === 'Record';
}
function isObjectType(type) {
    var _a;
    return ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.getName()) === '__type';
}
function isFunctionType(type) {
    return type.getCallSignatures().length !== 0;
}
function isTypeAlias(type) {
    var _a;
    if (type.isClassOrInterface())
        return true;
    var nodes = (_a = type.aliasSymbol) === null || _a === void 0 ? void 0 : _a.declarations;
    return nodes !== undefined && nodes.some(ts.isTypeAliasDeclaration);
}
function getTypeId(type) {
    return type.id;
}
function mergeArrays(array1, array2) {
    return __spread(new Set(__spread(array1, array2)));
}
function mergeObjects(obj1, obj2) {
    return __assign(__assign({}, obj1), obj2);
}
function mergeNumberObjects(obj1, obj2) {
    var result = __assign({}, obj1);
    var keys = getObjectNumberKeys(obj2);
    keys.forEach(function (key) { var _a; return result[key] = ((_a = obj1[key]) !== null && _a !== void 0 ? _a : 0) + obj2[key]; });
    return result;
}
function getObjectNumberKeys(object) {
    return Object.keys(object).map(function (num) { return parseInt(num); });
}
function mergeTransformationResultArray(array) {
    var aliases = array.map(function (res) { return res.aliases; }).reduce(mergeObjects, {});
    var recursions = array.map(function (res) { return res.recursions; }).reduce(mergeArrays, []);
    var nodesCount = array.map(function (res) { return res.nodesCount; }).reduce(mergeNumberObjects, {});
    return { aliases: aliases, recursions: recursions, nodesCount: nodesCount };
}
function mergeTypeTransformationResultArray(array) {
    return __assign({ nodesResult: array.map(function (res) { return res.nodeResult; }) }, mergeTransformationResultArray(array));
}
function convertTypesArray(types, namespace, typeChecker, data) {
    var transformNextType = function (types, data, result) {
        if (types.length === 0)
            return result;
        var _a = __read(types), head = _a[0], tail = _a.slice(1);
        var res = convertTypeToIoTs(head, namespace, typeChecker, data);
        var computed = mergeArrays(data.computed, getObjectNumberKeys(res.nodesCount));
        return transformNextType(tail, __assign(__assign({}, data), { computed: computed }), __spread(result, [res]));
    };
    return mergeTypeTransformationResultArray(transformNextType(types, data, []));
}
function convertUnionType(type, namespace, typeChecker, data) {
    var _a;
    var nodes = (_a = type.aliasSymbol) === null || _a === void 0 ? void 0 : _a.declarations;
    var types = nodes !== undefined && nodes.length !== 0 && nodes[0].type !== undefined
        ? nodes[0].type.types.map(typeChecker.getTypeFromTypeNode)
        : type.types;
    var result = convertTypesArray(types, namespace, typeChecker, data);
    var nodeResult = createMethodCall(namespace, 'union', [ts.createArrayLiteral(result.nodesResult)]);
    return __assign(__assign({}, result), { nodeResult: nodeResult });
}
function convertTupleType(type, namespace, typeChecker, data) {
    var result = convertTypesArray(type.resolvedTypeArguments, namespace, typeChecker, data);
    var nodeResult = createMethodCall(namespace, 'tuple', [ts.createArrayLiteral(result.nodesResult)]);
    return __assign(__assign({}, result), { nodeResult: nodeResult });
}
function convertArrayType(type, namespace, typeChecker, data) {
    var _a;
    var arrayType = ((_a = type.getSymbol()) === null || _a === void 0 ? void 0 : _a.escapedName) === 'ReadonlyArray' ? 'readonlyArray' : 'array';
    var args = type.typeArguments;
    if (args === undefined || args.length === 0)
        throw new Error('Array must have type arguments');
    var result = convertTypeToIoTs(args[0], namespace, typeChecker, data);
    var nodeResult = createMethodCall(namespace, arrayType, [result.nodeResult]);
    return __assign(__assign({}, result), { nodeResult: nodeResult });
}
function convertRecordType(type, namespace, typeChecker, data) {
    var args = type.aliasTypeArguments;
    if (args === undefined)
        throw new Error('Record must have type arguments');
    var result = convertTypesArray(args, namespace, typeChecker, data);
    var nodeResult = createMethodCall(namespace, 'record', result.nodesResult);
    return __assign(__assign({}, result), { nodeResult: nodeResult });
}
function isOptionalPropertyDeclaration(prop) {
    var property = prop.valueDeclaration;
    return property.questionToken !== undefined;
}
function isReadonlyPropertyDeclaration(prop) {
    var modifiers = prop.valueDeclaration.modifiers;
    if (modifiers === undefined)
        return false;
    return modifiers.some(function (token) { return token.kind === ts.SyntaxKind.ReadonlyKeyword; });
}
function extractProperty(prop, typeChecker) {
    var _a;
    var declaration = prop.valueDeclaration;
    var type = prop.type === undefined
        ? typeChecker.getTypeFromTypeNode(declaration.type)
        : (_a = prop.type.target) !== null && _a !== void 0 ? _a : prop.type;
    var name = String(prop.escapedName);
    return { name: name, type: type };
}
function buildPropertyName(name) {
    if (name.match(/^[a-zA-Z_]+[\w_]+$/) !== null)
        return name;
    return ts.createStringLiteral(name);
}
function separateArray(array, predicate) {
    var nextIteration = function (array, onTrue, onFalse) {
        if (array.length === 0)
            return [onTrue, onFalse];
        var _a = __read(array), head = _a[0], tail = _a.slice(1);
        if (predicate(head))
            return nextIteration(tail, __spread(onTrue, [head]), onFalse);
        return nextIteration(tail, onTrue, __spread(onFalse, [head]));
    };
    return nextIteration(array, [], []);
}
function convertObjectType(props, namespace, typeChecker, data) {
    if (props.length === 0)
        return wrapToTypeTransformationResult(createMethodCall(namespace, 'type', [ts.createObjectLiteral([])]));
    var preparedProps = props.map(function (prop) {
        var origin = prop.syntheticOrigin;
        return origin !== undefined ? origin : prop;
    });
    var _a = __read(separateArray(preparedProps, isReadonlyPropertyDeclaration), 2), readonlyProps = _a[0], editableProps = _a[1];
    var _b = __read(separateArray(readonlyProps, isOptionalPropertyDeclaration), 2), readonlyOptionalProps = _b[0], readonlyNonOptionalProps = _b[1];
    var _c = __read(separateArray(editableProps, isOptionalPropertyDeclaration), 2), editableOptionalProps = _c[0], editableNonOptionalProps = _c[1];
    var handlePropList = function (props, isPartial, data) {
        var handledProps = props.map(function (prop) { return extractProperty(prop, typeChecker); });
        var types = handledProps.map(function (prop) { return prop.type; });
        var result = convertTypesArray(types, namespace, typeChecker, data);
        var properties = result.nodesResult.map(function (p, i) { return ts.createPropertyAssignment(buildPropertyName(handledProps[i].name), p); });
        var objectType = isPartial ? 'partial' : 'type';
        var nodeResult = createMethodCall(namespace, objectType, [ts.createObjectLiteral(properties)]);
        return __assign(__assign({}, result), { nodeResult: nodeResult });
    };
    var result = [];
    var handleReadonlyProps = function (props, isPartial, data) {
        var res = handlePropList(props, isPartial, data);
        var nodeResult = createMethodCall(namespace, 'readonly', [res.nodeResult]);
        return __assign(__assign({}, res), { nodeResult: nodeResult });
    };
    var newData = data;
    if (readonlyOptionalProps.length !== 0) {
        var res = handleReadonlyProps(readonlyOptionalProps, true, newData);
        var computed = mergeArrays(newData.computed, getObjectNumberKeys(res.nodesCount));
        newData = __assign(__assign({}, data), { computed: computed });
        result.push(res);
    }
    if (readonlyNonOptionalProps.length !== 0) {
        var res = handleReadonlyProps(readonlyNonOptionalProps, false, newData);
        var computed = mergeArrays(newData.computed, getObjectNumberKeys(res.nodesCount));
        newData = __assign(__assign({}, data), { computed: computed });
        result.push(res);
    }
    if (editableOptionalProps.length !== 0) {
        var res = handlePropList(editableOptionalProps, true, newData);
        var computed = mergeArrays(newData.computed, getObjectNumberKeys(res.nodesCount));
        newData = __assign(__assign({}, data), { computed: computed });
        result.push(res);
    }
    if (editableNonOptionalProps.length !== 0)
        result.push(handlePropList(editableNonOptionalProps, false, newData));
    var merged = mergeTypeTransformationResultArray(result);
    var nodeResult = result.length === 1
        ? result[0].nodeResult
        : createMethodCall(namespace, 'intersection', [ts.createArrayLiteral(merged.nodesResult)]);
    return __assign(__assign({}, merged), { nodeResult: nodeResult });
}
function convertInterfaceType(type, namespace, typeChecker, data) {
    var _a;
    var props = (_a = type.declaredProperties) !== null && _a !== void 0 ? _a : [];
    var object = convertObjectType(props, namespace, typeChecker, data);
    var parents = type.symbol.declarations
        .map(function (d) { return d.heritageClauses; })
        .filter(Boolean)
        .reduce(mergeArrays, [])
        .map(function (clause) { return clause.types; })
        .reduce(mergeArrays, [])
        .map(typeChecker.getTypeFromTypeNode);
    if (parents.length === 0)
        return object;
    var newData = __assign(__assign({}, data), { computed: mergeArrays(data.computed, getObjectNumberKeys(object.nodesCount)) });
    var parentsTransformed = convertTypesArray(parents, namespace, typeChecker, newData);
    var nodesArray = __spread([object.nodeResult], parentsTransformed.nodesResult);
    var nodeResult = createMethodCall(namespace, 'intersection', [ts.createArrayLiteral(nodesArray)]);
    return __assign({ nodeResult: nodeResult }, mergeTransformationResultArray([object, parentsTransformed]));
}
function wrapToTypeTransformationResult(node) {
    return { nodeResult: node, nodesCount: {}, recursions: [], aliases: {} };
}
function createLiteralTransformationResult(namespace, literal) {
    return wrapToTypeTransformationResult(createMethodCall(namespace, 'literal', [literal]));
}
function createBasicTypeTransformationResult(namespace, typeName) {
    return wrapToTypeTransformationResult(createPropertyAccess(namespace, typeName));
}
function convertTypeToIoTs(type, namespace, typeChecker, data) {
    var _a, _b, _c;
    var stringType = typeChecker.typeToString(type);
    if (stringType === 'never')
        throw new Error('Never type transformation is not supported');
    if (type.isClass())
        throw new Error('Transformation of classes is not supported');
    var typeId = getTypeId(type);
    var fromIoTs = data.fromIoTsUsages[typeId];
    if (fromIoTs !== undefined)
        return wrapToTypeTransformationResult(ts.createIdentifier(fromIoTs));
    if (['null', 'undefined', 'void', 'unknown'].includes(stringType))
        return createBasicTypeTransformationResult(namespace, stringType);
    if (stringType === 'true' || stringType === 'false') {
        var literal = stringType === 'true' ? ts.createTrue() : ts.createFalse();
        return createLiteralTransformationResult(namespace, literal);
    }
    if (type.isStringLiteral())
        return createLiteralTransformationResult(namespace, ts.createStringLiteral(type.value));
    if (type.isNumberLiteral())
        return createLiteralTransformationResult(namespace, ts.createNumericLiteral(type.value.toString()));
    if (['string', 'number', 'boolean'].includes(stringType))
        return createBasicTypeTransformationResult(namespace, stringType);
    if (isFunctionType(type))
        return createBasicTypeTransformationResult(namespace, 'function');
    var isNamed = isTypeAlias(type);
    if (isNamed && data.computed.includes(typeId))
        return {
            nodeResult: ts.createIdentifier(generateNodeName(typeId, Object.values(data.fromIoTsUsages))),
            aliases: {},
            nodesCount: (_a = {}, _a[typeId] = 1, _a),
            recursions: data.stack.includes(typeId) ? data.stack.slice(data.stack.indexOf(typeId)) : []
        };
    var newData = __assign(__assign({}, data), { computed: mergeArrays(data.computed, [typeId]), stack: __spread(data.stack, [typeId]) });
    var result;
    if (type.isUnion())
        result = convertUnionType(type, namespace, typeChecker, newData);
    else if (isTupleType(type, typeChecker))
        result = convertTupleType(type, namespace, typeChecker, newData);
    else if (isArrayType(type, typeChecker))
        result = convertArrayType(type, namespace, typeChecker, newData);
    else if (isRecordType(type))
        result = convertRecordType(type, namespace, typeChecker, newData);
    else if (type.isClassOrInterface())
        result = convertInterfaceType(type, namespace, typeChecker, newData);
    else if (isObjectType(type))
        result = convertObjectType(type.getProperties(), namespace, typeChecker, newData);
    else
        result = createBasicTypeTransformationResult(namespace, 'void');
    var nodeResult = isNamed
        ? ts.createIdentifier(generateNodeName(typeId, Object.values(data.fromIoTsUsages)))
        : result.nodeResult;
    var newAlias = isNamed ? (_b = {}, _b[typeId] = result.nodeResult, _b) : {};
    var aliases = [result.aliases, newAlias].reduce(mergeObjects);
    var nodesCount = mergeNumberObjects(result.nodesCount, (_c = {}, _c[typeId] = 1, _c));
    return __assign(__assign({}, result), { nodeResult: nodeResult, aliases: aliases, nodesCount: nodesCount });
}
function createConstant(name, value) {
    var declaration = ts.createVariableDeclaration(ts.createIdentifier(name), undefined, value);
    var declarationList = ts.createVariableDeclarationList([declaration], ts.NodeFlags.Const);
    return ts.createVariableStatement(undefined, declarationList);
}
function createSimpleArrowFunction(body) {
    return ts.createArrowFunction(undefined, undefined, [], undefined, ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), body);
}
function createRecursiveTypeModel(namespace, name, model) {
    var recursion = createMethodCall(namespace, 'recursion', [
        ts.createStringLiteral(name),
        createSimpleArrowFunction(model)
    ]);
    return createConstant(name, recursion);
}
function generateNodeName(id, occupiedNames) {
    return findFreeName(function (name) { return !occupiedNames.includes(name); }, "node" + id + "_@");
}
function getTypeConstantId(constant) {
    var name = constant.text;
    return parseInt(name.split('_')[0].replace('node', ''));
}
function addConstantsOptimization(data, program, context) {
    var aliasKeys = getObjectNumberKeys(data.aliases);
    var embeddingIds = aliasKeys.filter(function (key) { return data.nodesCount[key] === 1; });
    var transformed = {};
    var mappingFunction = function (node) {
        var _a;
        if (!ts.isIdentifier(node))
            return node;
        var id = getTypeConstantId(node);
        if (embeddingIds.includes(id))
            return (_a = transformed[id]) !== null && _a !== void 0 ? _a : data.aliases[id];
        return node;
    };
    aliasKeys.forEach(function (key) { return transformed[key] = mapNodeAndChildren(data.aliases[key], program, context, mappingFunction); });
    var nodeResult = mapNodeAndChildren(data.nodeResult, program, context, mappingFunction);
    var aliases = {};
    aliasKeys.forEach(function (key) { if (!embeddingIds.includes(key))
        aliases[key] = transformed[key]; });
    return __assign(__assign({}, data), { nodeResult: nodeResult, aliases: aliases });
}
function getIntersectionNodeNamespace(node) {
    if (!ts.isCallExpression(node))
        return undefined;
    var expression = node.expression;
    var method = expression.name.escapedText;
    if (method !== 'intersection')
        return undefined;
    return expression.expression.escapedText;
}
function addNestedIntersectionsOptimization(data, program, context) {
    var aliasKeys = getObjectNumberKeys(data.aliases);
    var transformed = {};
    var mappingFunction = function (node) {
        var namespace = getIntersectionNodeNamespace(node);
        if (namespace === undefined)
            return node;
        var elementList = node.arguments[0].elements.map(function (element) {
            if (getIntersectionNodeNamespace(element) !== undefined)
                return element.arguments[0].elements;
            return element;
        });
        var elements = elementList.reduce(function (acc, element) {
            return Array.isArray(element) ? __spread(acc, element) : __spread(acc, [element]);
        }, []);
        return createMethodCall(namespace, 'intersection', [ts.createArrayLiteral(elements)]);
    };
    aliasKeys.forEach(function (key) { return transformed[key] = mapNodeAndChildren(data.aliases[key], program, context, mappingFunction); });
    var nodeResult = mapNodeAndChildren(data.nodeResult, program, context, mappingFunction);
    return __assign(__assign({}, data), { aliases: transformed, nodeResult: nodeResult });
}
function addMergingIntersectionElementsOptimization(data, program, context) {
    var aliasKeys = getObjectNumberKeys(data.aliases);
    var transformed = {};
    var mappingFunction = function (node) {
        var namespace = getIntersectionNodeNamespace(node);
        if (namespace === undefined)
            return node;
        var elements = node.arguments[0].elements;
        var readonlyPartialProps = [];
        var readonlyNonPartialProps = [];
        var partialProps = [];
        var nonPartialProps = [];
        var otherNodes = [];
        elements.forEach(function (element) {
            var _a, _b;
            var name = (_b = (_a = element === null || element === void 0 ? void 0 : element.expression) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.escapedText;
            if (name === 'readonly') {
                var argument = element.arguments[0];
                var argumentName = argument.expression.name.escapedText;
                if (argumentName === 'type')
                    readonlyNonPartialProps.push(argument.arguments[0]);
                else
                    readonlyPartialProps.push(argument.arguments[0]);
            }
            else if (name === 'type')
                nonPartialProps.push(element.arguments[0]);
            else if (name === 'partial')
                partialProps.push(element.arguments[0]);
            else
                otherNodes.push(element);
        });
        var readonlyPartial = readonlyPartialProps.map(function (node) { return node.properties; }).reduce(mergeArrays, []);
        var readonlyNonPartial = readonlyNonPartialProps.map(function (node) { return node.properties; }).reduce(mergeArrays, []);
        var partial = partialProps.map(function (node) { return node.properties; }).reduce(mergeArrays, []);
        var nonPartial = nonPartialProps.map(function (node) { return node.properties; }).reduce(mergeArrays, []);
        var result = otherNodes.length !== 0 ? __spread(otherNodes) : [];
        var createReadonly = function (object) { return createMethodCall(namespace, 'readonly', [object]); };
        var createPartial = function (object) { return createMethodCall(namespace, 'partial', [object]); };
        var createType = function (object) { return createMethodCall(namespace, 'type', [object]); };
        if (readonlyPartial.length !== 0)
            result.push(createReadonly(createPartial(ts.createObjectLiteral(readonlyPartial))));
        if (readonlyNonPartial.length !== 0)
            result.push((createReadonly(createType(ts.createObjectLiteral(readonlyNonPartial)))));
        if (partial.length !== 0)
            result.push((createPartial(ts.createObjectLiteral(partial))));
        if (nonPartial.length !== 0)
            result.push(createType(ts.createObjectLiteral(nonPartial)));
        if (result.length === 0)
            return createType(ts.createObjectLiteral());
        if (result.length === 1)
            return result[0];
        return createMethodCall(namespace, 'intersection', [ts.createArrayLiteral(result)]);
    };
    aliasKeys.forEach(function (key) { return transformed[key] = mapNodeAndChildren(data.aliases[key], program, context, mappingFunction); });
    var nodeResult = mapNodeAndChildren(data.nodeResult, program, context, mappingFunction);
    return __assign(__assign({}, data), { aliases: transformed, nodeResult: nodeResult });
}
function addPostOptimizations(data, program, context) {
    var constantsOptimized = addConstantsOptimization(data, program, context);
    var intersectionsFlat = addNestedIntersectionsOptimization(constantsOptimized, program, context);
    var intersectionElementsMerged = addMergingIntersectionElementsOptimization(intersectionsFlat, program, context);
    return intersectionElementsMerged;
}
function buildIoTsModeByTypeResult(result, namespace, occupiedNames) {
    var aliases = result.aliases, nodeResult = result.nodeResult;
    var ids = getObjectNumberKeys(aliases);
    if (ids.length === 0)
        return nodeResult;
    var constants = ids.map(function (id) { return result.recursions.includes(id)
        ? createRecursiveTypeModel(namespace, generateNodeName(id, occupiedNames), aliases[id])
        : createConstant(generateNodeName(id, occupiedNames), aliases[id]); });
    var iifeBlock = ts.createBlock(__spread(constants, [ts.createReturn(nodeResult)]), true);
    return ts.createCall(ts.createParen(createSimpleArrowFunction(iifeBlock)), undefined, []);
}
function convertTypeToIoTsType(type, namespace, fromIoTsUsages, typeChecker, program, context) {
    var initialData = { computed: [], stack: [], fromIoTsUsages: fromIoTsUsages };
    var result = convertTypeToIoTs(type, namespace, typeChecker, initialData);
    var optimizedResult = addPostOptimizations(result, program, context);
    return buildIoTsModeByTypeResult(optimizedResult, namespace, Object.values(fromIoTsUsages));
}
function normalizeFromIoTsUsages(usages, node) {
    if (ts.isSourceFile(node) || !ts.isVariableDeclaration(node.parent))
        return usages;
    var copy = __assign({}, usages);
    var keys = getObjectNumberKeys(copy);
    keys.forEach(function (key) { return copy[key] === (node.parent.name).escapedText && delete copy[key]; });
    return copy;
}
function getNodeVisitor(ioTsInstanceName, fromIoTsUsages, context) {
    return function (node, program) {
        if (isIndexJsImport(node))
            return undefined;
        var typeChecker = program.getTypeChecker();
        if (!isFunctionCallExpression(decoderFunctionName, indexTsPath)(typeChecker)(node))
            return node;
        var typeArguments = node.typeArguments;
        if (typeArguments === undefined || typeArguments.length === 0)
            throw new Error("Please pass a type argument to the " + decoderFunctionName + " function");
        var type = typeChecker.getTypeFromTypeNode(typeArguments[0]);
        var usages = normalizeFromIoTsUsages(fromIoTsUsages, node);
        return convertTypeToIoTsType(type, ioTsInstanceName, usages, typeChecker, program, context);
    };
}
