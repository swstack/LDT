'use strict';

var app = angular.module('LDT.controllers');

app.controller('EditorCtrl', ['$scope', function($scope) {

  $scope.editor = new Object;
  $scope.graph = new Object;
  $scope.pan = { x: 0, y: 0 }

  var graphID;
  var path_regex = /graphs\/([^\/]+)\/edit/;
  var matches = path_regex.exec(window.location.pathname);
  if (matches !== null)
    graphID = matches[1];

  if (graphID)
    $.ajax({ url:"/graphs/"+graphID, type:"GET", dataType:"json",
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("AJAX Error: ");
        console.log(textStatus);
      },
      success: function(data, textStatus, jqXHR) {
        $scope.$apply(function() {
          $scope.graph.id = graphID;
          $scope.graph.name = data.name;
          $scope.pan.x = data.pan_x || 0;
          $scope.pan.y = data.pan_y || 0;

          $scope.graph.entities = [];
          $scope.graph.relationships = [];
          $scope.graph.endpoints = [];

          _.each(data.entities, function(hash) {
            $scope.graph.entities.push(new Entity(hash));
          });

          _.each(data.relationships, function(hash) {
             var e1 = _.find($scope.graph.entities, function(e){
               return e.id == hash.entity1_id;
             });
             var e2 = _.find($scope.graph.entities, function(e){
               return e.id == hash.entity2_id;
             });

             var r = new Relationship(hash.id, e1, e2);

             r.endpoints[0].label  = hash.label1;
             r.endpoints[0].symbol = hash.symbol1;
             r.endpoints[1].label  = hash.label2;
             r.endpoints[1].symbol = hash.symbol2;

             $scope.graph.addRelationship(r);
          });

          $scope.graph.initialize();
        });
      }
    });


  // Click event handlers

  $scope.handleCanvasClick = function(x,y) {
    if ($scope.editor.mode == 'new_entity')
      $scope.graph.createEntity(x - $scope.pan.x, y - $scope.pan.y);

    setMode('select');
  };

  $scope.handleCanvasDrag = function(ev) {
    $scope.graph.panX += ev.originalEvent.movementX;
    $scope.graph.panY += ev.originalEvent.movementY;
  };

  $scope.handleEntityClick = function(entity) {
    switch($scope.editor.mode) {
      case 'new_relationship_start':
        $scope.editor.newRelationshipStart = entity;
        setMode('new_relationship_end');
        break;
      case 'new_relationship_end':
        $scope.graph.createRelationship($scope.editor.newRelationshipStart, entity);
        setMode('select');
        break;
      case 'delete_item':
        $scope.graph.deleteEntity(entity);
        setMode('select');
        break;
      default:
        break;
    }
  };

  $scope.handleRelationshipClick = function(relationship) {
    if ($scope.editor.mode == 'delete_item') {
      $scope.graph.deleteRelationship(relationship);
      setMode('select');
    }
  };

  $scope.handleAttributeClick = function(entityID, attributeIndex, ev) {
    if ($scope.editor.mode == 'identifier_bar') {
      $scope.graph.toggleAttributeIdentifier(entityID, attributeIndex);
    }
  };

  $scope.handleArrowClick = function(arrow, ev) {
    switch($scope.editor.mode) {
      case 'chickenfoot':
        // Use shift key to toggler identifier
        arrow.toggleArrowhead(false);
        break;
      case 'identifier_bar':
        // Use shift key to toggler identifier
        arrow.toggleArrowhead(true);
        break;
      case 'label_pick':
        arrow.selected = true;
        setMode('select');
        break;
      default:
        break;
    }
  };

  function setSaveMessage(status, message) {
    $('#save-message').show();
    $scope.$apply(function() {
      $scope.editor.saveStatus = status;
      $scope.editor.saveMessage = message;
    });
  };

  function fadeSaveMessage() {
    setTimeout(function() {
      $('#save-message').fadeOut();
    }, 3000); // after 3 seconds
  };

  $scope.saveCommand = function() {

    setSaveMessage('pending', 'Saving...');

    var graphData = {
      id        : $scope.graph.id,
      name      : $scope.graph.name,
      pan_x     : $scope.pan.x,
      pan_y     : $scope.pan.y
    };
    graphData.entities      = _.map($scope.graph.entities,      function(e) { return e.saveObject(); });
    graphData.relationships = _.map($scope.graph.relationships, function(r) { return r.saveObject(); });

    var encodeData = JSON.stringify(graphData);

    $.ajax({ url:"/graphs/"+graphData.id, type:"PUT", dataType:"json", data:encodeData, contentType:'application/json',
      success: function() {
        setSaveMessage('success', 'Saved'); fadeSaveMessage();
      },
      error: function(xhr, ajaxOptions, thrownError) {
        setSaveMessage('error', 'Save Failed!');
      }
    });
  };

  // Action buttons / hotkeys

  $scope.newCommand             = function() { window.location = '/graphs/new'; };
  $scope.openCommand            = function() { window.location = '/graphs/'; };
  $scope.selectCommand          = function() { $scope.$apply(setMode('select')); };
  $scope.newEntityCommand       = function() { $scope.$apply(setMode('new_entity')); };
  $scope.newRelationshipCommand = function() { $scope.$apply(setMode('new_relationship_start')); };
  $scope.deleteItemCommand      = function() { $scope.$apply(setMode('delete_item')); };
  $scope.labelCommand           = function() { $scope.$apply(setMode('label_pick')); };
  $scope.chickenFootCommand     = function() { $scope.$apply(setMode('chickenfoot')); };
  $scope.identifierBarCommand   = function() { $scope.$apply(setMode('identifier_bar')); };

  function setMode(mode) {
    $scope.editor.mode = mode;

    var modeMessages = {
      select: '',
      new_entity: '',
      new_relationship_start: 'click to start relationship',
      new_relationship_end: 'click to end relationship',
      delete_item: 'click to delete',
      label_pick: ''
    };

    $scope.editor.entityOverlayMessage = modeMessages[mode];
  }

  setMode('select');

}]);
