// Ported to JS from one of these:
// http://paulbourke.net/papers/triangulate/

"use strict";

const abs = Math.abs;
const sqrt = Math.sqrt;

function vec(x, y)      { return {x:x, y:y} }
function normalize(p)   { return scale(p, 1 / magnitude(p)) }
function magnitude(p)   { return sqrt(p.x * p.x + p.y * p.y) }
function subtract(p, q) { return {x: p.x - q.x, y: p.y - q.y} }
function add(p, q)      { return {x: p.x + q.x, y: p.y + q.y} }
function scale(p, s)    { return {x: p.x * s,   y: p.y * s} }
function copy(p)        { return {x: p.x, y: p.y} }
function average(p, q)  { return scale(add(p,q), 1/2) }
function distance(p, q) { return magnitude(subtract(p, q)) }
function midpoint(v1, v2) { return {x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2}; }
function dist2(p, q) { var dx = p.x - q.x, dy = p.y - q.y; return dx*dx + dy*dy; }
function dot(u, v) { return u.x * v.x + u.y * v.y; }
function scalarCross(u, v) { return u.x * v.y - u.y * v.x; }  // sine of angle between

// function test(u, v, w) {
//   let uv = normalize(subtract(v, u)), vw = normalize(subtract(w, v));
//   console.log(u,v,w,uv,vw);
//   console.log(dot(uv,vw), scalarCross(uv,vw));
// }
// test({x:1,y:1},{x:2,y:2},{x:3,y:3})
// test({x:0,y:0},{x:1,y:0},{x:1,y:1})
// test({x:0,y:0},{x:1,y:0},{x:1,y:-1})
// test({x:0,y:0},{x:1,y:0},{x:0,y: 0.1})
// test({x:0,y:0},{x:1,y:0},{x:0,y:-0.1})


// Triangulation subroutine
// Takes as input vertices in array seeds, which will be sorted in increasing x values, eg:
// v.sort(function (p1, p2) { return p1.x - p2.x });
// Returned is a list of triangular faces in the array
// These triangles are arranged in a consistent clockwise order.
// Members:
//   seeds:     x,y: position;           voronoi points
//              neighbors[index]=>edge   indices of neighbor seeds to edge dividing them
//              edges[index]=>seed       indices of edges to neighbor seed
//   triangles: [{p1,p2,p3: indices into seeds}]   delauny triangulation
//   nodes:     [{x,y: position; edges:[3 indices into edges]}]    corners in voronoi graph
//   edges:     [{p1,p2: indices into nodes, seeds:[s1,s2]}]      edges in voronoi graph
class Triangulation {


   edges_from_node(node_index) {
      return this.nodes[node_index].edges;
   }

   far_node(edge_index, near_index) {
      let {p1,p2} = this.edges[edge_index];
      return p1 == near_index ? p2 : p1;
   }


   constructor (seeds) {
      seeds.sort(function (p1,p2) { return p1.x - p2.x });

      this.seeds = seeds;
      var nv = seeds.length;

      function triangle(p1, p2, p3) { return {p1:p1, p2:p2, p3:p3, complete:false} }
      function edge(p1, p2) { return {p1:p1, p2:p2} }

      var triangles = this.triangles = [];

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
      triangles.push(triangle(nv, nv+1, nv+2));

      // Include each point one at a time into the existing mesh
      for (var i = 0; i < nv; i++) {
         var p = seeds[i];
         var edges = [];  // of edge(...)

         // Set up the edge buffer.
         // If the point (xp,yp) lies inside the circumcircle then the
         // three edges of that triangle are added to the edge buffer
         // and that triangle is removed.
         for (var j = 0; j < triangles.length; j++) {
            if (triangles[j].complete)
               continue;
            var p1 = seeds[triangles[j].p1];
            var p2 = seeds[triangles[j].p2];
            var p3 = seeds[triangles[j].p3];
            var cc = circumCircle(p1, p2, p3);
            if (cc.x < p.x && ((p.x-cc.x)*(p.x-cc.x)) > cc.rr)
   				triangles[j].complete = true;
            if (inCircle(p.x, p.y, cc)) {
               edges.push(edge(triangles[j].p1, triangles[j].p2));
               edges.push(edge(triangles[j].p2, triangles[j].p3));
               edges.push(edge(triangles[j].p3, triangles[j].p1));
               triangles.splice(j, 1);
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
            triangles.push(triangle(edges[j].p1, edges[j].p2, i));
         }
      }

      // Remove triangles with supertriangle vertices
      triangles = this.triangles = triangles.filter(function (t) {
         return t.p1 < nv && t.p2 < nv && t.p3 < nv;
      });

      // Remove the supertriangle vertices
      seeds.pop();
      seeds.pop();
      seeds.pop();

      this.computeDual();

      // Note seed neighbors
      seeds.forEach(s => s.neighbors = []);
      triangles.forEach(t => {
         seeds[t.p1].neighbors.push(t.p2);
         seeds[t.p1].neighbors.push(t.p3);
         seeds[t.p2].neighbors.push(t.p1);
         seeds[t.p2].neighbors.push(t.p3);
         seeds[t.p3].neighbors.push(t.p1);
         seeds[t.p3].neighbors.push(t.p2);
      });

      // Note indices of seeds
      seeds.forEach((s,i) => s.index = i);
   }


   computeDual() {
      var nodes = this.nodes = [];  // Nodes in the Voronoi diagram
      var sides = {};  // Sides of the Delauny triagles; values `{p1,p2,ts}` are indices into `this.seeds` and `this.triangles`
      function key(p1, p2) { return p1 + "," + p2 }
      for (var i = 0; i < this.triangles.length; ++i) {
         var t = this.triangles[i];
         var cc = circumCircle(this.seeds[t.p1], this.seeds[t.p2], this.seeds[t.p3]);
         cc.edges = [];  // a place to map nodes to the edges that end there
         nodes.push(cc);
         function addSide(p1, p2) {
            if (p1 > p2) { var t = p1; p1 = p2; p2 = t }
            var k = key(p1, p2);
            if (!(k in sides)) sides[k] = {p1:p1, p2:p2, ts:[]};
            sides[k].ts.push(i);
         }
         addSide(t.p1, t.p2);
         addSide(t.p2, t.p3);
         addSide(t.p3, t.p1);
      }

      this.edges = [];  // Elements are {p1,p2,seeds[]}, indices into nodes and seeds
      // this.seeds.forEach(s => [s.edges,s.neighbors] = [{},{}]);  // Each seed has a mapping from edges to the neighbor accross it
      this.seeds.forEach(s => s.edges = {});  // Each seed has a mapping from edges to the neighbor accross it
      for (var k in sides) {
         var e = sides[k];
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
            end.outside = true;  // we'll call this an outside point
            nodes.push(end);
         }
         nodes[e.ts[0]].edges.push(this.edges.length); // Point from nodes...
         nodes[e.ts[1]].edges.push(this.edges.length); // ...to edges
         let edge = {p1:e.ts[0], p2:e.ts[1], seeds: [e.p1,e.p2]};  // Point from edge to nodes and seeds
         this.seeds[e.p1].edges[this.edges.length] = e.p2;  // Point from seeds...
         this.seeds[e.p2].edges[this.edges.length] = e.p1;  // ...accross edges to neighbors
         // this.seeds[e.p1].neighbors[e.p2] = this.edges.length;  // Point from seeds...
         // this.seeds[e.p2].neighbors[e.p1] = this.edges.length;  // ...through neighbors to edges
         if (nodes[e.ts[1]].outside) edge.outside = true;  // we'll call an edge to an outside point an outside edge
         this.edges.push(edge);
      }
   }

   // Returns a list of node indices
   findPath(start, goal, neighbors, dist_between, heuristic_cost_estimate) {
      if (!heuristic_cost_estimate)
         heuristic_cost_estimate = (i,j) => distance(this.nodes[i], this.nodes[j]);
       var ClosedSet = new Set();         // The set of nodes already evaluated.
       var OpenSet = [start];    // The set of tentative nodes to be evaluated
       var Came_From = {};    // The map of navigated nodes.

       var g_score = {};  // map with default value of Infinity
       g_score[start] = 0;    // Cost from start along best known path.
       // Estimated total cost from start to goal through y.
       var f_score = {};  // map with default value of Infinity
       f_score[start] = heuristic_cost_estimate(start, goal);

       while (OpenSet.length > 0) {
          OpenSet.sort(function (a,b) { return f_score[b] - f_score[a] });
           var current = OpenSet.pop();
           if (current == goal) {
              // Reconstruct path
              var total_path = [current];
            while (current in Came_From) {
                current = Came_From[current];
                total_path.push(current);
            }
            return total_path;
         }
           ClosedSet.add(current);
           var ns = neighbors(current);
           for (let neighbor of ns) {
               if (ClosedSet.has(neighbor))
                   continue;      // Ignore the neighbor which is already evaluated.
               var tentative_g_score = g_score[current] + dist_between(current, neighbor) // length of this path.
               if (OpenSet.indexOf(neighbor) == -1)   // Discover a new node
                   OpenSet.push(neighbor);
               else if (tentative_g_score >= g_score[neighbor])
                   continue;      // This is not a better path.

               // This path is the best until now. Record it!
               Came_From[neighbor] = current;
               g_score[neighbor] = tentative_g_score;
               f_score[neighbor] = g_score[neighbor] + heuristic_cost_estimate(neighbor, goal);
           }
       }
       throw "findPath failed";
   }
}


// Find the circle containing the three points. I.e. center {x,y} equidistant
// from the three points, at squared distance {rr}
const EPSILON = 0.0000001;
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

