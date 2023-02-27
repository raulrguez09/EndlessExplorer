/**
 * game.js
 * 
 * Trabajo 1 AGM
 * 
 * @author <>, 2022
 * 
 */

// Modulos necesarios
import * as THREE from "../lib/three.module.js";
import {GLTFLoader} from "../lib/GLTFLoader.module.js";
import {OrbitControls} from "../lib/OrbitControls.module.js";
import {TWEEN} from "../lib/tween.module.min.js";
import {GUI} from "../lib/lil-gui.module.min.js";

// Variables estandar
let renderer, scene, camera;

// Variables de control del fondo de la escena
let grid, time = 0;

// Variables para el manejo de los obstaculos y bonus
let soldado, shipBody, ship, objectParent, obstaculo, esferaSup, esferaInf, cuerpoCap, bonus, asteroide, skyBox;

// Otras globales
let cameraControls, effectController;
//let esferaCubo,cubo,esfera;
let angulo = 0, speedZ = 20, speedX = 0, translateX = 0;
let clock = new THREE.Clock();

// Acciones
init();
loadScene();
setupGUI();
render();

function init()
{
    // Instanciar el motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth,window.innerHeight);
    document.getElementById('container').appendChild( renderer.domElement );

    // Instanciar el nodo raiz de la escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0,0,0);

    // Instanciar la camara
    camera= new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,100);
    camera.position.z = 5;
    camera.rotateX(-20 * Math.PI / 180)
    camera.position.set(0,1.5,2);

    cameraControls = new OrbitControls( camera, renderer.domElement );
    cameraControls.target.set(0,1,0);
    camera.lookAt(0,1,0);

    // Eventos
    //renderer.domElement.addEventListener('keydown', keydown.bind(this));
    //renderer.domElement.addEventListener('keyup', keyup.bind(this));
    document.addEventListener('keydown', keydown)
    document.addEventListener('keyup', keyup)
}

function update(){
    angulo += 0.01;
    time += clock.getDelta();
    translateX += speedX * -0.1;

    grid.material.uniforms.time.value = time;
    objectParent.position.z = speedZ * time;

    grid.material.uniforms.translateX.value = translateX;
    objectParent.position.x = translateX;
    
    objectParent.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
        const childZPos = child.position.z + objectParent.position.z;
        if (childZPos > 0){
          if(child.userData.type === 'obstaculo'){
            setupObstacle(child, -translateX, -objectParent.position.z)
          }else if(child.userData.type === 'bonus'){
            setupBonus(child, -translateX, -objectParent.position.z)
          }
        }
      }
    });
}

function loadScene(){
    // Material sencillo
    // const materialSuelo = new THREE.MeshBasicMaterial({color:'yellow'});
    // const materialNave = new THREE.MeshBasicMaterial({color:'black'});
    scene.add( new THREE.AxesHelper(3) );    
    console.log(scene)
    scene.background = new THREE.CubeTextureLoader().setPath('./images/cosa/').load(
      [
      'posx.jpg',
      'negx.jpg',
      'posy.jpg',
      'negy.jpg',
      'posz.jpg',
      'negz.jpg'
      ]
    )

    // var geometry = new THREE.SphereGeometry(1000, 60, 40);
		// var material = new THREE.MeshBasicMaterial();
		// material.map = THREE.ImageUtils.loadTexture("images/Sky.jpg");
		// material.side = THREE.BackSide;
		// skyBox = new THREE.Mesh(geometry, material);
		// scene.background = skyBox;

    const gltfLoader2 = new GLTFLoader();
      gltfLoader2.load('./models/nave2/scene.gltf', (gltf) => {
        gltf.scene.position.set(0,0,0)
        gltf.scene.rotateX(-70 * Math.PI / 180); // rojo
        gltf.scene.rotateZ(45 * Math.PI / 180); //azul
        //gltf.scene.rotateY(15 * Math.PI / 180); // verde
        scene.add(gltf.scene)
    });

    const light = new THREE.AmbientLight( 0x404040, 10 ); // soft white light
    scene.add( light );

    // Creamos y establecemos la animación del fondo 
    setupGrid();
    
    //
    objectParent = new THREE.Group();
    scene.add(objectParent);

    for( let i = 0; i < 5; i++){
      spawnObstacle();
    }

    for( let i = 0; i < 5; i++){
      spawnBonus();
    }

    // scene.background = new THREE.Color(0x2a3b4c)
}

function setupGrid(){
  var division = 30;
  var limit = 200;
  grid = new THREE.GridHelper(limit * 2, division);
  grid.visible = false

  var moveable = [];
  var moveableX = [];
  for (let i = 0; i <= division; i++) {
    moveableX.push(0, 0, 1, 1); // move VERTICAL lines only (1 - point is moveable)
    moveable.push(1, 1, 0, 0); // move horizontal lines only (1 - point is moveable)
  }
  grid.geometry.addAttribute('moveableX', new THREE.BufferAttribute(new Uint8Array(moveableX), 1));
  grid.geometry.addAttribute('moveable', new THREE.BufferAttribute(new Uint8Array(moveable), 1));
  grid.material = new THREE.ShaderMaterial({
    uniforms: {
      time: {
        value: 0
      },
      limits: {
        value: new THREE.Vector2(-limit, limit)
      },
      speed: {
        value: 5
      },
      translateX: {
        value: translateX
      }
    },
    vertexShader: `
      uniform float time;
      uniform vec2 limits;
      uniform float speed;
      uniform float translateX;
      
      attribute float moveable;
      attribute float moveableX;
      
      varying vec3 vColor;
    
      void main() {
        vColor = color;
        float limLen = limits.y - limits.x;
        vec3 pos = position;
        if (floor(moveableX + 0.5) > 0.5){ // if a point has "moveableX" attribute = 1 
          float xDist = translateX;
          float curXPos = mod((pos.x + xDist) - limits.x, limLen) + limits.x;
          pos.x = curXPos;
        }
        if (floor(moveable + 0.5) > 0.5){ // if a point has "moveable" attribute = 1 
          float dist = speed * time;
          float currPos = mod((pos.z + dist) - limits.x, limLen) + limits.x;
          pos.z = currPos;
        } 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
    
      void main() {
        gl_FragColor = vec4(vColor, 1.);
      }
    `,
    vertexColors: THREE.VertexColors
  });

  scene.add(grid);
}

function setupGUI()
{
	// Definicion de los controles
	effectController = {
		mensaje: 'Soldado & Robota',
		giroY: 0.0,
		separacion: 0,
		colorsuelo: "rgb(150,150,150)"
	};

	// Creacion interfaz
	const gui = new GUI();

	// Construccion del menu
	const h = gui.addFolder("Control esferaCubo");
	h.add(effectController, "mensaje").name("Aplicacion");
	h.add(effectController, "giroY", -180.0, 180.0, 0.025).name("Giro en Y");
	h.add(effectController, "separacion", { 'Ninguna': 0, 'Media': 2, 'Total': 5 }).name("Separacion");
    h.addColor(effectController, "colorsuelo").name("Color alambres");

}

function spawnObstacle(){
  // let geometriaObst = new THREE.BoxBufferGeometry(1, 1, 1);
  // let materialObst = new THREE.MeshBasicMaterial({color: 0xccdeee})
  // obstaculo = new THREE.Mesh(geometriaObst, materialObst)

  // setupObstacle(obstaculo);
  //objectParent.add(obstaculo)

  const gltfLoader = new GLTFLoader();
  gltfLoader.load('./models/old/scene.gltf', (gltf) => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh){
        scene.add(child)
        setupObstacle(child);
        objectParent.add(child)        
      }
    });
  });
}

function setupObstacle(obstaculo, refXPos = 0, refZPos = 0){
  var rand = randomFloat(0.5, 4)
  obstaculo.scale.set(rand, rand, rand)

  obstaculo.position.set(refXPos + randomFloat(-30, 30), obstaculo.scale.y * 0.5, refZPos - 100 - randomFloat(0,100))

  obstaculo.userData = { type: 'obstaculo' }
}

function spawnBonus(){
  bonus = new THREE.Object3D();

  esferaSup = new THREE.Mesh(new THREE.SphereGeometry(1,64,32,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaSup.rotateX(-90 * Math.PI / 180)
  esferaSup.position.y = 1
  esferaInf = new THREE.Mesh(new THREE.SphereGeometry(1,15,20,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaInf.rotateX(90 * Math.PI / 180)
  esferaInf.position.y = -1
  cuerpoCap = new THREE.Mesh(new THREE.CylinderGeometry( 1, 1, 2, 32, 64 ),  new THREE.MeshBasicMaterial({color: 0x4ee138}));
  
  bonus.add(esferaSup)
  bonus.add(esferaInf)
  bonus.add(cuerpoCap)

  setupBonus(bonus)
  objectParent.add(bonus)
}

function setupBonus(bonus, refXPos = 0, refZPos = 0){
  const price = randomInt(5, 20);
  const ratio = price / 20;

  const size = ratio * 0.5;
  bonus.scale.set(size, size, size)

  bonus.position.set(refXPos + randomFloat(-30, 30), bonus.scale.y * 0.5, refZPos - 100 - randomFloat(0,100))

  bonus.userData = { type: 'bonus' }
}

function randomFloat(min, max){
  return Math.random() * (max - min) + min;
}

function randomInt(min, max){
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animate(event)
{
    // Capturar y normalizar
    let x= event.clientX;
    let y = event.clientY;
    x = ( x / window.innerWidth ) * 2 - 1;
    y = -( y / window.innerHeight ) * 2 + 1;

    // Construir el rayo y detectar la interseccion
    const rayo = new THREE.Raycaster();
    rayo.setFromCamera(new THREE.Vector2(x,y), camera);
    const soldado = scene.getObjectByName('soldado');
    const robot = scene.getObjectByName('robota');
    let intersecciones = rayo.intersectObjects(soldado.children,true);

    if( intersecciones.length > 0 ){
        new TWEEN.Tween( soldado.position ).
        to( {x:[0,0],y:[3,1],z:[0,0]}, 2000 ).
        interpolation( TWEEN.Interpolation.Bezier ).
        easing( TWEEN.Easing.Bounce.Out ).
        start();
    }

    intersecciones = rayo.intersectObjects(robot.children,true);

    if( intersecciones.length > 0 ){
        new TWEEN.Tween( robot.rotation ).
        to( {x:[0,0],y:[Math.PI,-Math.PI/2],z:[0,0]}, 5000 ).
        interpolation( TWEEN.Interpolation.Linear ).
        easing( TWEEN.Easing.Exponential.InOut ).
        start();
    }
}

function render()
{
    requestAnimationFrame(render);
    update();
    renderer.render(scene,camera);
}

function keydown(event){
  let newSpeedX;
    switch (event.key) {
      case 'ArrowLeft':
        newSpeedX = -1.0;
        break;
      case 'ArrowRight':
        newSpeedX = 1.0;
        break;
      default:
        return;
    }

    speedX = newSpeedX;
}

function keyup(){
  speedX = 0;
}
