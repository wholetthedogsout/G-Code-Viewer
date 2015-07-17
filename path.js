/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser, GCodeViewer */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the path view.
 */

GCodeViewer.TotalSize = (function() {
    "use strict";
    function TotalSize(scene) {
        var that = this;

        that.remove = function() {
            that.scene.remove(that.textWidth);
            that.scene.remove(that.lineWidth);
            that.scene.remove(that.textLength);
            that.scene.remove(that.lineLength);
            that.scene.remove(that.textHeight);
            that.scene.remove(that.lineHeight);
        };

        that.add = function() {
            that.scene.add(that.textWidth);
            that.scene.add(that.lineWidth);
            that.scene.add(that.textLength);
            that.scene.add(that.lineLength);
            that.scene.add(that.textHeight);
            that.scene.add(that.lineHeight);
        };

        function createMeshText(message, options, color) {
            var material = new THREE.MeshBasicMaterial({ color: color });
            var textShapes = THREE.FontUtils.generateShapes(message, options);
            var geo = new THREE.ShapeGeometry(textShapes);
            return new THREE.Mesh(geo, material);
        }

        that.setMeshes = function(totalSize, inMm) {
            var material = new THREE.LineBasicMaterial( { color : 0xffffff });
            var geometry = new THREE.Geometry();
            var type = (inMm === false) ? "in" : "mm";
            var delta = (inMm === false) ? 1 : GCodeViewer.mmToInch;
            var width = Math.abs(totalSize.max.x - totalSize.min.x) * delta;
            var length = Math.abs(totalSize.max.y - totalSize.min.y) * delta;
            var height = Math.abs(totalSize.max.z - totalSize.min.z) * delta;
            var options = {'font' : 'helvetiker','weight' : 'normal',
                'style' : 'normal','size' : 2,'curveSegments' : 300};
            var color = 0xffffff;

            //TODO: center correctly

            geometry.vertices.push(new THREE.Vector3(totalSize.min.x, -2 , 0));
            geometry.vertices.push(new THREE.Vector3(totalSize.max.x, -2 , 0));
            that.lineWidth =  new THREE.Line(geometry, material);
            that.textWidth = createMeshText(width + " " + type, options, color);
            that.textWidth.position.x = that.lineWidth.position.x + width / 2;
            that.textWidth.position.y = that.lineWidth.position.y - 2;
            that.textWidth.position.z = that.lineWidth.position.z;

            geometry.vertices.push(new THREE.Vector3(-2, totalSize.min.y, 0));
            geometry.vertices.push(new THREE.Vector3(-2, totalSize.max.y, 0));
            that.lineLength =  new THREE.Line(geometry, material);
            that.textLength = createMeshText(length + " " + type, options, color);
            that.textLength.position.x = that.lineLength.position.x - 2;
            that.textLength.position.y = that.lineLength.position.y  + length / 2;
            that.textLength.position.z = that.lineLength.position.z;

            geometry.vertices.push(new THREE.Vector3(-2, 0, totalSize.min.z));
            geometry.vertices.push(new THREE.Vector3(-2, 0, totalSize.max.z));
            that.lineHeight =  new THREE.Line(geometry, material);
            that.textHeight = createMeshText(height + " " + type, options, color);
            that.textHeight.position.x = that.lineHeight.position.x - 2;
            that.textHeight.position.y = that.lineHeight.position.y;
            that.textHeight.position.z = that.lineHeight.position.z  + height / 2;
            that.textHeight.rotateX(Math.PI / 2);
        };

        function initialize(scene) {
            that.scene = scene;
            that.textWidth = {};
            that.lineWidth = {};
            that.textLength = {};
            that.lineLength = {};
            that.textHeight = {};
            that.lineHeight = {};
        }
        initialize(scene);
    }

    return TotalSize;
}());

GCodeViewer.Path = (function () {
    "use strict";
    function Path(scene) {
        var that = this;

        function resetPathsGeo() {
            that.geoG0Undone = new THREE.Geometry();
            that.geoG1Undone = new THREE.Geometry();
            that.geoG2G3Undone = new THREE.Geometry();
            that.geoG0Done = new THREE.Geometry();
            that.geoG1Done = new THREE.Geometry();
            that.geoG2G3Done = new THREE.Geometry();
        }

        function resetPathsMesh() {
            that.meshG0Undone = {};
            that.meshG1Undone = {};
            that.meshG2G3Undone = {};
            that.meshG0Done = {};
            that.meshG1Done = {};
            that.meshG2G3Done = {};
        }

        function resetTotalSize() {
            that.totalSize = { min : {x:0, y:0, z:0}, max : { x:0, y:0, z:0} };
        }

        function checkTotalSize(boundingBox) {
            var keys = ["x", "y", "z"];
            var i = 0;
            if(boundingBox === null) {
                return;
            }
            for(i = keys.length - 1; i >= 0; i--) {
                if(that.totalSize.min[keys[i]] > boundingBox.min[keys[i]]) {
                    that.totalSize.min[keys[i]] = boundingBox.min[keys[i]];
                }
                if(that.totalSize.max[keys[i]] < boundingBox.max[keys[i]]) {
                    that.totalSize.max[keys[i]] = boundingBox.max[keys[i]];
                }
            }
        }

        that.removeTotalSize = function() {
            that.objTotalSize.remove();
        };

        that.addTotalSize = function() {
            that.objTotalSize.add();
        };

        that.remove = function() {
            that.scene.remove(that.meshG0Undone);
            that.scene.remove(that.meshG1Undone);
            that.scene.remove(that.meshG2G3Undone);
            that.scene.remove(that.meshG0Done);
            that.scene.remove(that.meshG1Done);
            that.scene.remove(that.meshG2G3Done);
        };

        that.add = function(withTotalSize) {
            that.scene.add(that.meshG0Undone);
            that.scene.add(that.meshG1Undone);
            that.scene.add(that.meshG2G3Undone);
            that.scene.add(that.meshG0Done);
            that.scene.add(that.meshG1Done);
            that.scene.add(that.meshG2G3Done);
            if(withTotalSize === true) {
                that.removeTotalSize();
                that.addTotalSize();
            }
        };

        // that.getTotalSize = function(cncConfiguration) {
        that.getTotalSize = function() {
            resetTotalSize();
            if(that.meshG0Undone.geometry.vertices.length > 0) {
                that.meshG0Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG0Undone.geometry.boundingBox);
            }
            if(that.meshG1Undone.geometry.vertices.length > 0) {
                that.meshG1Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG1Undone.geometry.boundingBox);
            }
            if(that.meshG2G3Undone.geometry.vertices.length > 0) {
                that.meshG2G3Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG2G3Undone.geometry.boundingBox);
            }
            if(that.meshG0Done.geometry.vertices.length > 0) {
                that.meshG0Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG0Done.geometry.boundingBox);
            }
            if(that.meshG1Done.geometry.vertices.length > 0) {
                that.meshG1Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG1Done.geometry.boundingBox);
            }
            if(that.meshG2G3Done.geometry.vertices.length > 0) {
                that.meshG2G3Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG2G3Done.geometry.boundingBox);
            }

            return that.totalSize;
        };

        // that.getGeometry = function(lines) {
        function setGeometries(lines) {
            var i = 0, j = 0;
            var geometry = new THREE.Geometry();

            if(lines.length === 0) {
                return;
            }

            for(i=0; i < lines.length; i++) {
                if(lines[i].type === GCodeViewer.STRAIGHT) {
                    geometry = lines[i].getGeometry();
                    if(lines[i].word === "G0") {
                        that.geoG0Undone.merge(geometry);
                    } else {
                        that.geoG1Undone.merge(geometry);
                    }
                } else if(lines[i].type === GCodeViewer.CURVED) {
                    geometry = lines[i].getGeometry();
                    that.geoG2G3Undone.vertices.push(geometry.vertices[0]);
                    for(j=1; j < geometry.vertices.length-1; j++) {
                        that.geoG2G3Undone.vertices.push(geometry.vertices[j]);
                        that.geoG2G3Undone.vertices.push(geometry.vertices[j]);
                    }
                    if(geometry.vertices.length > 1) {
                        that.geoG2G3Undone.vertices.push(
                            geometry.vertices[geometry.vertices.length - 1]
                        );
                    }

                }
            }
        }

        that.setMeshes = function(lines) {
            resetPathsGeo();
            resetPathsMesh();
            setGeometries(lines);

            that.meshG0Undone = new THREE.Line(that.geoG0Undone,
                    that.matG0Undone, THREE.LinePieces);
            that.meshG1Undone = new THREE.Line(that.geoG1Undone,
                    that.matG1Undone, THREE.LinePieces);
            that.meshG2G3Undone = new THREE.Line(that.geoG2G3Undone,
                    that.matG2G3Undone, THREE.LinePieces);
            that.meshG0Done = new THREE.Line(that.geoG0Done,
                    that.matG0Done, THREE.LinePieces);
            that.meshG1Done = new THREE.Line(that.geoG1Done,
                    that.matG1Done, THREE.LinePieces);
            that.meshG2G3Done = new THREE.Line(that.geoG2G3Done,
                    that.matG2G3Done, THREE.LinePieces);

            //TODO: manage inch/millimeter
            that.objTotalSize.remove();
            that.objTotalSize.setMeshes(that.getTotalSize(), false);
        };

        function initialize(scene) {
            that.scene = scene;
            resetPathsGeo();
            resetPathsMesh();
            that.matG0Undone = new THREE.LineDashedMaterial(
                    { color : 0x8877dd, dashSize : 7 });
            that.matG1Undone = new THREE.LineBasicMaterial(
                    { color : 0xffffff });
            that.matG2G3Undone = new THREE.LineBasicMaterial(
                    { color : 0xffffff });
            that.matG0Done = new THREE.LineDashedMaterial(
                    { color : 0x8877dd, dashSize : 2 });
            that.matG1Done = new THREE.LineBasicMaterial({ color : 0xff0000 });
            that.matG2G3Done = new THREE.LineBasicMaterial({ color : 0xee6699 });
            resetTotalSize();
            that.objTotalSize = new GCodeViewer.TotalSize(that.scene);
        }

        initialize(scene);
    }
    return Path;
}());
