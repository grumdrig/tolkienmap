// http://paulbourke.net/papers/triangulate/

"use strict";

var abs = Math.abs;

function midpoint(v1, v2) {
   return {x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2};
}

function dist2(p, q) {
   var dx = p.x - q.x, dy = p.y - q.y;
   return dx*dx + dy*dy;
}


// Triangulation subroutine
// Takes as input vertices in array seeds, which will be sorted in increasing x values, eg:
// v.sort(function (p1, p2) { return p1.x - p2.x });
// Returned is a list of triangular faces in the array
// These triangles are arranged in a consistent clockwise order.
function Triangulation(seeds) {
   seeds.sort(function (p1,p2) { return p1.x - p2.x });

   this.seeds = seeds;
   var nv = seeds.length;

   function triangle(p1, p2, p3) { return {p1:p1, p2:p2, p3:p3, complete:false} }
   function edge(p1, p2) { return {p1:p1, p2:p2} }

   this.triangles = [];

   // Find the maximum and minimum vertex bounds.
   // This is to allow calculation of the bounding triangle
   var xmin = seeds[0].x;
   var ymin = seeds[0].y;
   var xmax = seeds[nv - 1].x;
   var ymax = ymin;
   for (var i = 1; i < nv; i++) {
      if (seeds[i].y < ymin) ymin = seeds[i].y;
      if (seeds[i].y > ymax) ymax = seeds[i].y;
   }
   var dx = xmax - xmin;
   var dy = ymax - ymin;
   var dmax = (dx > dy) ? dx : dy;
   var xmid = (xmax + xmin) / 2;
   var ymid = (ymax + ymin) / 2;

   // Set up the supertriangle
   // This is a triangle which encompasses all the sample points.
   // The supertriangle coordinates are added to the end of the
   // vertex list. The supertriangle is the first triangle in
   // the triangle list.
   seeds.push({x: xmid - 20 * dmax, y: ymid - dmax});
   seeds.push({x: xmid,             y: ymid + 20 * dmax});
   seeds.push({x: xmid + 20 * dmax, y: ymid - dmax});
   this.triangles.push(triangle(nv, nv+1, nv+2));

   // Include each point one at a time into the existing mesh
   for (var i = 0; i < nv; i++) {
      var p = seeds[i];
      var edges = [];  // of edge(...)

      // Set up the edge buffer.
      // If the point (xp,yp) lies inside the circumcircle then the
      // three edges of that triangle are added to the edge buffer
      // and that triangle is removed.
      for (var j = 0; j < this.triangles.length; j++) {
         if (this.triangles[j].complete)
            continue;
         var p1 = seeds[this.triangles[j].p1];
         var p2 = seeds[this.triangles[j].p2];
         var p3 = seeds[this.triangles[j].p3];
         var cc = circumCircle(p1, p2, p3);
         if (cc.x < p.x && ((p.x-cc.x)*(p.x-cc.x)) > cc.rr)
				this.triangles[j].complete = true;
         if (inCircle(p.x, p.y, cc)) {
            edges.push(edge(this.triangles[j].p1, this.triangles[j].p2));
            edges.push(edge(this.triangles[j].p2, this.triangles[j].p3));
            edges.push(edge(this.triangles[j].p3, this.triangles[j].p1));
            this.triangles.splice(j, 1);
            j--;
         }
      }

      // Tag multiple edges
      // Note: if all triangles are specified anticlockwise then all
      //       interior edges are opposite pointing in direction.
      for (var j = 0; j < edges.length - 1; j++) {
         for (var k = j + 1; k < edges.length; k++) {
            if ((edges[j].p1 == edges[k].p2) && (edges[j].p2 == edges[k].p1)) {
               edges[j].p1 = -1;
               edges[j].p2 = -1;
               edges[k].p1 = -1;
               edges[k].p2 = -1;
            }
            // Shouldn't need the following, see note above
            if ((edges[j].p1 == edges[k].p1) && (edges[j].p2 == edges[k].p2)) {
               edges[j].p1 = -1;
               edges[j].p2 = -1;
               edges[k].p1 = -1;
               edges[k].p2 = -1;
            }
         }
      }

      // Form new triangles for the current point
      // Skipping over any tagged edges.
      // All edges are arranged in clockwise order.
      for (var j = 0; j < edges.length; j++) {
         if (edges[j].p1 < 0 || edges[j].p2 < 0)
            continue;
         this.triangles.push(triangle(edges[j].p1, edges[j].p2, i));
      }
   }

   // Remove triangles with supertriangle vertices
   this.triangles = this.triangles.filter(function (t) {
      return t.p1 < nv && t.p2 < nv && t.p3 < nv;
   });

   // Remove the supertriangle vertices
   seeds.pop();
   seeds.pop();
   seeds.pop();

   this.computeDual();
}

/*
   Return { inside: true } if a point (xp,yp) is inside the circumcircle made up
   of the points (x1,y1), (x2,y2), (p3.x,y3)
   The circumcircle center is returned as (xc,yc) and the squared radius rsqr
   NOTE: A point on the edge is inside the circumcircle
*/
var EPSILON = 0.0000001;
function circumCircle(p1, p2, p3) {
   var m1,m2,mx1,mx2,my1,my2;
   var dx,dy,drsqr;

   var dy12 = abs(p1.y - p2.y);
   var dy23 = abs(p2.y - p3.y);

   /* Check for coincident points */
   if (dy12 < EPSILON && dy23 < EPSILON)
       return { x:p1.x, y:p1.y, r:0 };

   var xc, yc, rsqr;

   if (dy12 < EPSILON) {
      var m2 = - (p3.x - p2.x) / (p3.y - p2.y);
      var mx2 = (p2.x + p3.x) / 2;
      var my2 = (p2.y + p3.y) / 2;
      xc = (p2.x + p1.x) / 2;
      yc = m2 * (xc - mx2) + my2;
   } else if (dy23 < EPSILON) {
      var m1 = - (p2.x - p1.x) / (p2.y - p1.y);
      var mx1 = (p1.x + p2.x) / 2;
      var my1 = (p1.y + p2.y) / 2;
      xc = (p3.x + p2.x) / 2;
      yc = m1 * (xc - mx1) + my1;
   } else {
      var m1 = - (p2.x - p1.x) / (p2.y - p1.y);
      var m2 = - (p3.x - p2.x) / (p3.y - p2.y);
      var mx1 = (p1.x + p2.x) / 2;
      var mx2 = (p2.x + p3.x) / 2;
      var my1 = (p1.y + p2.y) / 2;
      var my2 = (p2.y + p3.y) / 2;
      xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      if (dy12 > dy23) {
         yc = m1 * (xc - mx1) + my1;
      } else {
         yc = m2 * (xc - mx2) + my2;
      }
   }

   var dx = p2.x - xc;
   var dy = p2.y - yc;
   rsqr = dx*dx + dy*dy;
   return {x: xc, y: yc, rr: rsqr};
}

function inCircle(xp, yp, cc) {
   var dx = xp - cc.x;
   var dy = yp - cc.y;
   var dsqr = dx*dx + dy*dy;
   return (dsqr - cc.rr) <= EPSILON;
}

Triangulation.prototype.computeDual = function () {
   var nodes = [];
   var edges = {};
   function key(p1, p2) { return p1 + "," + p2 }
   for (var i = 0; i < this.triangles.length; ++i) {
      var t = this.triangles[i];
      var cc = circumCircle(this.seeds[t.p1], this.seeds[t.p2], this.seeds[t.p3]);
      cc.edges = [];  // a place to map nodes to edges
      nodes.push(cc);
      function addEdge(p1, p2) {
         if (p1 > p2) { var t = p1; p1 = p2; p2 = t }
         var k = key(p1, p2);
         if (!(k in edges)) edges[k] = {p1:p1, p2:p2, ts:[]};
         edges[k].ts.push(i);
      }
      addEdge(t.p1, t.p2);
      addEdge(t.p2, t.p3);
      addEdge(t.p3, t.p1);
   }
   for (var i = 0; i < edges.length; ++i) {
      var e = edges[i];
      edges[i] = {p1: nodes[e.ts[0]], p2: nodes[e.ts[1]]};
   }

   var es = [];
   for (var k in edges) {
      var e = edges[k];
      if (e.ts.length == 1) {
         // This edge is on the outside, w/o a triangle on the other side, so we
         // must construct a point for the edge
         e.ts.push(nodes.length);  // ...it'll be the next one which we're building now
         // First candidate is the midpoint on the edge.
         var end = midpoint(this.seeds[e.p1], this.seeds[e.p2]);
         // That's the right one if it's closer to either of the edge points than it is to the third
         // triangle point which is not on this edge
         var t1 = this.triangles[e.ts[0]];
         var p3 = [t1.p1, t1.p2, t1.p3].filter(function (p) { return p != e.p1 && p != e.p2 })[0];
         p3 = this.seeds[p3];
         if (dist2(end, this.seeds[e.p1]) > dist2(end, p3)) {
            // Must need to go the opposite way
            var c1 = nodes[e.ts[0]];
            end = subtract(scale(c1, 2), end);
         }
         end.edges = [];
         nodes.push(end);
      }
      nodes[e.ts[0]].edges.push(es.length); // Point from nodes...
      nodes[e.ts[1]].edges.push(es.length); // ...to edges
      es.push({p1:e.ts[0], p2:e.ts[1]});
   }
   this.nodes = nodes;
   this.edges = es;
}

