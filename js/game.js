/**
 * File: game.js
 * 
 * Trabajo #1 AGM: Pagina Web 3D 
 * Descripcion: Se ha llevado a cabo la creación de un juego del genero "endless running", ambientado en una
 * nave espacial que tiene el obbjetivo de sobrevivir viajando por el espacio. Todo este trabajo se ha 
 * desarrollado empleando WebGL y la biblioteca Three.js
 * 
 * @author <@raulrguez09>, 2023
 * 
 */

//***********************************************/
/*  ZONA DE IMPORTS Y DECLARACION DE VARIABLES  */
//***********************************************/

// Modulos de las bibliotecas necesarias
import * as THREE from "../lib/three.module.js";
import {GLTFLoader} from "../lib/GLTFLoader.module.js";
import {OrbitControls} from "../lib/OrbitControls.module.js";
import {TWEEN} from "../lib/tween.module.min.js";
import {GUI} from "../lib/lil-gui.module.min.js";

// Variables estandar de la escena
let renderer, scene, camera;
let cameraControls, effectController;

// Variables para el control del fondo de la escena
let grid, time = 0;
let speedZ = 20, speedX = 0, translateX = 0;
let clock = new THREE.Clock();

// Variables para la gestion de los objetos de la escena
let objectParent, esferaSup, esferaInf, cuerpoCap, bonus;

// Variables para el control de la informacion de la partida
let health = 100, score = 0; 

let divScore = document.getElementById('score')
let divHealth = document.getElementById('health')
let divDistance = document.getElementById('distance')

divScore.innerText = score
divDistance.innerText = 0
divHealth.value = 100

let jugar = false;
document.getElementById('start').onclick = () => {
  jugar = true;
  document.getElementById('intro-panel').style.display = 'none'
}


//***********************************************/
/*     LLAMADA A LAS ACCIONES DE LA ESCENA      */
//***********************************************/

init();
loadScene();
setupGUI();
render();


//***********************************************/
/*   DECLARACIÓN DE LAS FUNCIONES DEL JUEGO     */
//***********************************************/

//---------------------------------------------------------------------//
// Function name: checkJobExistence                                    //
// Params: ID (String) - identificador del trabajo                     //
//         ID_MAP (Map) - mapa que almacena los ID's de los trabajos   //
//                        actuales                                     //
// Definition: Funcion que comprueba la existencia de un trabajo, dado //
//             dado su identificador                                   //
// Return: Devuelve un booleano cuyo valor será true - cuando el       //
//         trabajo exista o haya existido, y false - cuando el trabajo //
//         no exista, ni haya existido                                 //
//---------------------------------------------------------------------//

//---------------------------------------------------------------------//
// Nombre: init                                                        //
// Descripcion: función que instancia las principales variables de la  //
//              escenea (motor de render, nodo raíz de la escena,      //
//              camara) y captura los eventos de tecklado              // 
//---------------------------------------------------------------------//
function init(){
  // Instanciar el motor de render
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth,window.innerHeight);
  document.getElementById('container').appendChild( renderer.domElement );
  renderer.antialias = true;
  renderer.shadowMap.enabled = true;

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

  // Creamos las luces de la escena
  const direccional = new THREE.DirectionalLight(0xFFFFFF,10);
  direccional.position.set(-80,20,-80);
  direccional.castShadow = true;
  scene.add(direccional);
  scene.add(new THREE.DirectionalLightHelper(direccional));

  const light = new THREE.AmbientLight( 0x23046b, 1 ); // soft white light
  scene.add( light );

  // Eventos de teclado
  document.addEventListener('keydown', keydown)
  document.addEventListener('keyup', keyup)
}


//---------------------------------------------------------------------//
// Nombre: update                                                      //
// Descripcion: función que se ejecuta en cada renderización de la     //
//              escena y realiza diversas acciones como modificar la   //
//              geometría de los objetos de la escena, actualizar el   //
//              panel de info, comprobar las colisiones, etc.          //
//---------------------------------------------------------------------//
function update(){
  // Comprobamos si el usuario quiere jugar
  if(jugar){
    // Una vez empieza el juego
    // Calculamos valores del tiempo y velocidad del desplazamiento
    // de la cuadrícula que simula el movimiento 
    time += clock.getDelta();
    translateX += speedX * -0.1;

    grid.material.uniforms.time.value = time;
    objectParent.position.z = speedZ * time;

    grid.material.uniforms.translateX.value = translateX;
    objectParent.position.x = translateX;
    
    // Comprobamos si los objetos de la nave han sobrepasado a la misma
    objectParent.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
        const childZPos = child.position.z + objectParent.position.z;
        if (childZPos > 0){
          // Una vez sobrepasados, los trasladamos de nuevo en frente de la nave
          // modificando su estructura
          if(child.userData.type === 'obstaculo'){
            setupObstacle(child, -translateX, -objectParent.position.z)
          }else if(child.userData.type === 'bonus'){
            const price = setupBonus(child, -translateX, -objectParent.position.z)
            child.userData.bonusPrice = price
          }
        }
      }
    });
    
    // Actualizamos la información de la distancia recorrida
    divDistance.innerText = objectParent.position.z.toFixed(0)

    // Comprobamos las posibles colisiones con los objetos de la escena
    checkCollisions()

  }
}


//---------------------------------------------------------------------//
// Nombre: checkCollisions                                             //
// Descripcion: función que comprueba si se ha producido una colisión  //
//              con alguno de los objetos de la escena, y realiza las  //
//              funciones oportunas dependiendo del objeto que sea     //
//---------------------------------------------------------------------//
function checkCollisions(){
  // Recorremos los objetos dentro del grupo
  objectParent.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
      const childZPos = child.position.z + objectParent.position.z;

      // Calculamos la distancia límite que establecemos para la colisión
      const limiteX = 0.3 + child.scale.x / 2;
      const limiteZ = 0.3 + child.scale.z / 2;

      // Calculamos si se ha producido la colisión
      if(childZPos > -limiteZ && Math.abs(child.position.x - (-translateX)) < limiteX){
        // Realizamos las acciones oportunas si chocamos con un objeto
        if(child.userData.type === 'obstaculo'){
          health -= 10
          divHealth.value = health
          setupObstacle(child, -translateX, -objectParent.position.z)
          if(health <= 0){
            gameOver();
          }
        
        // Realizamos las acciones oportunas si chocamos con un bonus
        }else if(child.userData.type === 'bonus'){
          score += child.userData.bonusPrice
          divScore.innerText = score

          child.userData.bonusPrice = setupBonus(child, -translateX, -objectParent.position.z)
        }
      }
    }
  });
}



function gameOver(){
  jugar = false;

  divScore.innerText = score
  divDistance.innerText = 0
  divHealth.value = 100

}


//---------------------------------------------------------------------//
// Nombre: loadScene                                                   //
// Descripcion: función que crea los diferentes elementos de la escena //
//              como la nave, los obtáculos, los bonus, etc.           //
//---------------------------------------------------------------------//
function loadScene(){
  scene.add( new THREE.AxesHelper(3) ); 
  
  // Importamos el modelo 3D de la nave a la escena
  // https://sketchfab.com/search?features=downloadable&q=spaceship&type=models
  const gltfLoader2 = new GLTFLoader();
  gltfLoader2.load('./models/nave2/scene.gltf', (gltf) => {
    gltf.scene.name = 'nave';
    gltf.scene.position.set(0,0,0)
    gltf.scene.rotateX(-70 * Math.PI / 180); // rojo
    gltf.scene.rotateZ(45 * Math.PI / 180); // azul
    
    scene.add(gltf.scene)
  });

  // Creamos y establecemos la animación de la
  // cuadrícula de la escena
  setupGrid();
    
  // Creamos el grupo al que pertenecerán los obstaculos
  // y los bonus
  objectParent = new THREE.Group();
  scene.add(objectParent);

  // Creamos los obstáculos y los bonus de la escena
  for( let i = 0; i < 5; i++){
    spawnObstacle();
    spawnBonus();
  }

  var geometry = new THREE.SphereGeometry( 12,64,32,0 );
  //const texture = new THREE.TextureLoader().load( './images/sun.jpg' );
  const material = new THREE.MeshPhongMaterial({ emissive: 0xffffdf});
  var sphere = new THREE.Mesh( geometry, material );
  sphere.position.set(-90, 20, -90)
  

  const haloVertexShader = /*glsl*/`
  varying vec3 vertexNormal;
  void main() {
       vertexNormal = normal;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);   
  }
  `;
  const haloFragmentShader = /*glsl*/`
  varying vec3 vertexNormal;
  void main() {
  float intensity = pow(0.9 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
  gl_FragColor = vec4(0.8, 1.0, 0.6, 0.2) * intensity;
  }
  `;
  const halo = new THREE.Mesh(
       new THREE.SphereGeometry(12,64,32,0),
       new THREE.ShaderMaterial({
            vertexShader:haloVertexShader,
            fragmentShader:haloFragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
       })
  )
  
  scene.add(sphere);
  halo.scale.set(1.2, 1.2, 1.2);
  halo.position.set(-90, 20, -90)
  scene.add(halo);


  // Añadimos el fondo de la escena, utilizando la técnica de skyBox
  scene.background = new THREE.CubeTextureLoader().setPath('./images/skybox/').load(
    [
    'right.png', // pos x - right
    'left.png', // neg x - left
    'top.png', // pos y - up
    'bottom.png', // neg y - down
    'back.png', // pos z - back
    'front.png', // neg z - front
    ]
  )
}


//---------------------------------------------------------------------//
// Nombre: setupGrid                                                   //
// Descripcion: función que crea la cuadricula y los shaders que nos   //
//              permitiran simular el movimiento infinito de la misma  //
//---------------------------------------------------------------------//
function setupGrid(){
  // Establecemos y creamos las dimensiones de la cuadrícula
  var division = 30;
  var limit = 200;
  grid = new THREE.GridHelper(limit * 2, division);
  //grid.visible = false

  // Creamos los atributos para depslazar las lineas de la cuadricuña
  var moveable = [];
  var moveableX = [];
  for (let i = 0; i <= division; i++) {
    // movimiento en las lineas verticales 
    moveableX.push(0, 0, 1, 1); 
    // movimiento en las lineas horizontales 
    moveable.push(1, 1, 0, 0); 
  }
  grid.geometry.addAttribute('moveable', new THREE.BufferAttribute(new Uint8Array(moveable), 1));
  grid.geometry.addAttribute('moveableX', new THREE.BufferAttribute(new Uint8Array(moveableX), 1));
  
  // Creamos los shaders necesarios para simular el movimiento
  // https://stackoverflow.com/questions/51470309/three-js-and-infinite-forward-grid-movement
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

  // Añadimos la cuadricula a la escena
  scene.add(grid);
}


//---------------------------------------------------------------------//
// Nombre: setupGUI                                                    //
// Descripcion: 
//---------------------------------------------------------------------//
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


//---------------------------------------------------------------------//
// Nombre: spawnObstacle                                               //
// Descripcion: función que añade un obstaculo a la escena y al grupo, //
//              además de darle forma llamando a las funciones         //
//              pertinentes                                            //
//---------------------------------------------------------------------//
function spawnObstacle(){
  // Añadimos el obstaculo tanto a la escena como al grupo objectParent
  // Además mandamos al método 'setupObstacle' para modificar la geometría del mismo
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


//---------------------------------------------------------------------//
// Nombre: setupObstacle                                               //
// Parametros: obstaculo (THREE.Mesh) - malla del obstaculo            //
//             refXPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje X (inicialmente 0)      //
//             refZPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje Z (inicialmente 0)      //
// Descripcion: función que modifica el tamaño y la posición del       //
//              obstaculo pasado como parámetro                        //
//---------------------------------------------------------------------//
function setupObstacle(obstaculo, refXPos = 0, refZPos = 0){
  // Utilizamos un valor aleatorio para modificar el tamaño del obstaculo
  var rand = randomNumber(0.5, 4, "float")
  obstaculo.scale.set(rand, rand, rand)

  // Posicionamos el obstaculo junto en frente de nuestra nave
  obstaculo.position.set(refXPos + randomNumber(-30, 30, "float"), obstaculo.scale.y * 0.5, refZPos - 100 - randomNumber(0,100, "float"))

  // Añadimos la etiqueta de 'obstaculo' a la malla
  obstaculo.userData = { type: 'obstaculo' }
}


//---------------------------------------------------------------------//
// Nombre: spawnBonus                                                  //
// Descripcion: función que crea el objeto bonus, dandole forma y      //
//              estableciendo su posición en la escena                 //
//---------------------------------------------------------------------//
function spawnBonus(){
  // Creamos un objeto 3D donde agruparemos las diferentes partes del bonus
  bonus = new THREE.Object3D();

  // Creamos la parte superior del bonus
  esferaSup = new THREE.Mesh(new THREE.SphereGeometry(1,64,32,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaSup.rotateX(-90 * Math.PI / 180)
  esferaSup.position.y = 1
  
  // Creamos la parte inferior del bonus 
  esferaInf = new THREE.Mesh(new THREE.SphereGeometry(1,15,20,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaInf.rotateX(90 * Math.PI / 180)
  esferaInf.position.y = -1
  
  // Creamos el cuerpo del bonus
  cuerpoCap = new THREE.Mesh(new THREE.CylinderGeometry( 1, 1, 2, 32, 64 ),  new THREE.MeshBasicMaterial({color: 0x4ee138}));
  
  // Añadimos las parteas al objeto 3D bonus
  bonus.add(esferaSup)
  bonus.add(esferaInf)
  bonus.add(cuerpoCap)

  // Modificamos el tam y pos del objeto
  const price = setupBonus(bonus)

  // Agregamos etiqueta sobre el tipo de objeto y el precio
  bonus.userData = { type: 'bonus', bonusPrice: price}

  // Añadimos el objeto al grupo
  objectParent.add(bonus)
}


//---------------------------------------------------------------------//
// Nombre: setupBonus                                                  //
// Parametros: bonus (THREE.Mesh) - malla del bonus                    //
//             refXPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje X (inicialmente 0)      //
//             refZPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje Z (inicialmente 0)      //
// Descripcion: función que modifica el tamaño y la posición del       //
//              bonus, además de devolver el precio/valor del mismo    //
// Return: price (Int) - valor del bonus, el cual sirve para la        //
//                       puntuación del jugador                        //
//---------------------------------------------------------------------//
function setupBonus(bonus, refXPos = 0, refZPos = 0){
  // Utilizamos un valor aleatorio para modificar el tamaño del bonus
  const price = randomNumber(5, 20, "int");
  const ratio = price / 20;
  const size = ratio * 0.5;
  bonus.scale.set(size, size, size)

  // Posicionamos el obstaculo junto en frente de nuestra nave
  bonus.position.set(refXPos + randomNumber(-30, 30, "float"), bonus.scale.y * 0.5, refZPos - 100 - randomNumber(0,100, "float"))

  // Devolvemos el valor del bonus
  return price;
}


//---------------------------------------------------------------------//
// Nombre: randomNumber                                                //
// Parametros: min (Int/Float) - mínimo valor del intervalo            //
//             max (Int/Float) - máximo valor del intervalo            //
//             type (String) - cadena de caracteres que establezca el  //
//                             tipo de número aleatorio requerido      //
// Descripcion: función que devuelve un número aleatorio dentro de un  //
//              intervalo dado                                         //
// Return: number (Int/Float) - dependiendo del valor de 'type' se     //
//                              devolverá un número entero o un float  //
//---------------------------------------------------------------------//
function randomNumber(min, max, type){
  if(type === "float"){
    return Math.random() * (max - min) + min;
  }else if(type === "int"){
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}



function render()
{
    requestAnimationFrame(render);
    update();
    TWEEN.update();
    renderer.render(scene,camera);
}


//---------------------------------------------------------------------//
// Nombre: animateShip                                                 //
// Parametros: target (Float) - valor objetido para la rotación        //
//             delay (Float) - valor del retardo de la animacion       //
// Descripcion: función que realiza una animación de rotación de la    //
//              nave, dependiendo del target y el delay pasados como   //
//              parámetros                                             //
//---------------------------------------------------------------------//
function animateShip(target, delay){
  const nave = scene.getObjectByName('nave');
  new TWEEN.Tween(nave.rotation).to({ y: target}, delay)
  .onComplete(function() {
      if (Math.abs(nave.rotation.y)>=2*Math.PI) {
          nave.rotation.y = nave.rotation.y % (2*Math.PI);
      }
  })
  .start();
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

    if(speedX !== newSpeedX){
      speedX = newSpeedX;
      animateShip(speedX * 20 * Math.PI / 180, 1)
    }
}



function keyup(event){
  speedX = 0;
  animateShip(0, 0.5)
}
