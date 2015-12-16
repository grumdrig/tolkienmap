// http://paulbourke.net/papers/triangulate/

// Triangulation subroutine
// Takes as input vertices in array pxyz, which must be sorted in increasing x values, eg:
// v.sort(function (p1, p2) { return p1.x - p2.x });
// Returned is a list of triangular faces in the array
// These triangles are arranged in a consistent clockwise order.
function triangulate(pxyz) {
   var nv = pxyz.length;

   function triangle(p1, p2, p3) { return {p1:p1, p2:p2, p3:p3, complete:false} }
   function edge(p1, p2) { return {p1:p1, p2:p2} }

   var v = [];  // of triangle(...)

   // Find the maximum and minimum vertex bounds.
   // This is to allow calculation of the bounding triangle
   var xmin = pxyz[0].x;
   var ymin = pxyz[0].y;
   var xmax = xmin;
   var ymax = ymin;
   for (var i = 1; i < nv; i++) {
      if (pxyz[i].x < xmin) xmin = pxyz[i].x;
      if (pxyz[i].x > xmax) xmax = pxyz[i].x;
      if (pxyz[i].y < ymin) ymin = pxyz[i].y;
      if (pxyz[i].y > ymax) ymax = pxyz[i].y;
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
   pxyz.push({x: xmid - 20 * dmax, y: ymid - dmax});
   pxyz.push({x: xmid,             y: ymid + 20 * dmax});
   pxyz.push({x: xmid + 20 * dmax, y: ymid - dmax});
   v.push(triangle(nv, nv+1, nv+2));

   // Include each point one at a time into the existing mesh
   for (var i = 0; i < nv; i++) {
      var p = pxyz[i];
      var edges = [];  // of edge(...)

      // Set up the edge buffer.
      // If the point (xp,yp) lies inside the circumcircle then the
      // three edges of that triangle are added to the edge buffer
      // and that triangle is removed.
      for (var j = 0; j < v.length; j++) {
         if (v[j].complete)
            continue;
         var p1 = pxyz[v[j].p1];
         var p2 = pxyz[v[j].p2];
         var p3 = pxyz[v[j].p3];
         var cc = circumCircle(p1, p2, p3);
         if (cc.x < p.x && ((p.x-cc.x)*(p.x-cc.x)) > cc.rr)
				v[j].complete = true;
         if (inCircle(p.x, p.y, cc)) {
            edges.push(edge(v[j].p1, v[j].p2));
            edges.push(edge(v[j].p2, v[j].p3));
            edges.push(edge(v[j].p3, v[j].p1));
            v.splice(j, 1);
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
         v.push(triangle(edges[j].p1, edges[j].p2, i));
      }
   }

   // Remove triangles with supertriangle vertices
   v = v.filter(function (t) {
      return t.p1 < nv && t.p2 < nv && t.p3 < nv;
   });

   return v;
}

var fabs = Math.abs;

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

   var fabsy1y2 = fabs(p1.y - p2.y);
   var fabsy2y3 = fabs(p2.y - p3.y);

   /* Check for coincident points */
   if (fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
       return { x:p1.x, y:p1.y, r:0 };

   var cx, yc, rsqr;

   if (fabsy1y2 < EPSILON) {
      var m2 = - (p3.x - p2.x) / (p3.y - p2.y);
      var mx2 = (p2.x + p3.x) / 2;
      var my2 = (p2.y + p3.y) / 2;
      xc = (p2.x + p1.x) / 2;
      yc = m2 * (xc - mx2) + my2;
   } else if (fabsy2y3 < EPSILON) {
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
      if (fabsy1y2 > fabsy2y3) {
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

function dual(pts, triangles) {
   var verts = [];
   var edges = {};
   function key(p1, p2) { return p1 + "," + p2 }
   for (var i = 0; i < triangles.length; ++i) {
      var t = triangles[i];
      var cc = circumCircle(pts[t.p1], pts[t.p2], pts[t.p3]);
      // console.log(cc, t);
      verts.push(cc);
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
      edges[i] = {p1: verts[e.ts[0]], p2: verts[e.ts[1]]};
   }
   var es = [];
   for (var k in edges) {
      var e = edges[k];
      if (e.ts.length > 1) {
         es.push(edges[k]);
         // console.log(k, edges[k], edges[k].ts);
      }
   }
   return {vertices: verts, edges: es};
}


