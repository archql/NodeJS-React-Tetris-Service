import * as THREE from 'three'
import {useFrame, useLoader, useThree} from "@react-three/fiber";
import {
    OrbitControls,
    Stats,
    Text,
    useTexture,
    MeshWobbleMaterial,
    MeshDistortMaterial,
    PointMaterial, Point, Points
} from "@react-three/drei";
import { extend } from "@react-three/fiber";
import {Fragment, useMemo, useRef, useState} from "react";
import {SandShaderMaterial, WaveShaderMaterial} from "./shaders";
import {BufferAttribute} from "three";
import {COLOR_TABLE, FIELD_H, FIELD_W} from "../../game/tetris";

extend({WaveShaderMaterial})

function toColor(r, g, b, a = 1.0) {
    return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`
}
export function nextRandInt(from, to) {
    return Math.floor(Math.random() * (to - from + 1)) + from;
}

export function GameDisplay({game /* : Tetris */}) {
    // TODO
    return (
        <Fragment>
            <TetrisFigure
                figure={game.currentFigure}
            />
            <TetrisField
                field={game.field}
            />
        </Fragment>
    )
}

export function Platform() {


    return (
        <div></div>
    )
}

export function TetrisFigure({ figure, colorId, zPos, xPos, yPos }) {
    const components = []
    const x = xPos ?? figure.x;
    const y = yPos ?? figure.y;
    const z = zPos ?? 0;
    const pos = [x, y, z]
    const color = (colorId !== undefined) ? colorId : figure.color;

    let fig = figure.value;

    const c = COLOR_TABLE[color];
    const clr = toColor(c[0], c[1], c[2])

    //console.log("AAAAAAAAAAA ", clr)

    for (let i = 0; i < 4; i++) { // 4 is fig w and h
        const yPos = i * FIELD_W;
        for (let j = 0; j < 4; j++) {
            if ((fig & 0x8000) !== 0) {
                components.push(
                    <TetrisBlock
                        key={j + yPos}
                        position={[i, j, 0]}
                        type={figure.type}
                        clr={clr}
                    />
                );
            }
            fig <<= 1;
        }
    }
    return (
        <mesh position={pos}>
            {components}
        </mesh>
    )
}

export function TetrisField({field}) {
    const components = []
    for (let i = 0; i < FIELD_H; ++i) {
        const yPos = i * FIELD_W;
        for (let j = 0; j < FIELD_W; ++j) {
            const block = field[j + yPos]
            const c = COLOR_TABLE[block.color];
            const clr = toColor(c[0], c[1], c[2])
            components.push(
                <TetrisBlock
                    key={j + yPos}
                    position={[i, j, 0]}
                    type={block.type}
                    clr={clr}
                />
            );
        }
    }
    return (
        <mesh>
            {components}
        </mesh>
    )
}

export function TetrisBlock ({ position, type, clr }) {
    const particleCount = 100;
    const texture = useTexture('/block_simple.png'); // Replace with the path to your texture image
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const [time, setTime] = useState(0);
    useFrame(({ clock }) => {
        setTime(clock.getElapsedTime())
    });
    const bufferRef = useRef();
    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = Math.random() - 0.5 ; // x position
            positions[i * 3 + 1] = Math.random() - 0.5; // y position
            positions[i * 3 + 2] = 1.0;
        }
        return positions;
    }, [particleCount])
    const col = Math.floor((Math.sin(6*time) * 0.5 + 0.7) * 255);
    switch (type) {
        case 'liquid': return (
            <mesh position={position}>
                <boxGeometry args={[1, 1, 1, 8, 8, 2]}/>
                <waveShaderMaterial uColor={clr} uTexture={texture} uTime={time} transparent={true}/>
            </mesh>
        )
        case 'ghost': return (
            <mesh position={position}>
                <boxGeometry/>
                <meshBasicMaterial
                    map={texture}
                    transparent={true}
                    opacity={Math.sin(6*time) * 0.1 + 0.5}
                    color={clr}
                />
            </mesh>
        )
        case 'tnt': return (
            <mesh position={position}>
                <boxGeometry/>
                <meshBasicMaterial
                    map={texture}
                    transparent={true}
                    color={`rgba(255, ${col}, ${col}, 1)`}
                />
            </mesh>
        )
        case 'sand': return (
                <Fragment>
                    <points position={position}>
                    <bufferGeometry attach="geometry">
                            <bufferAttribute
                                ref={bufferRef}
                            attach='attributes-position'
                            count={particlesPosition.length / 3}
                            itemSize={3}
                            array={particlesPosition}
                        />
                    </bufferGeometry>
                    <pointsMaterial
                        color={"yellow"}
                        size={3}
                    />
                </points>
                <mesh position={position}>
                    <boxGeometry/>
                    <meshBasicMaterial
                        map={texture}
                        transparent={true}
                        color={clr}
                    />
                </mesh>
            </Fragment>
        )
        default:
            return (
                <mesh position={position}>
                    <boxGeometry/>
                    <meshBasicMaterial
                        map={texture}
                        transparent={true}
                        color={clr}
                    />
                </mesh>
            )
    }
}

export function TitlePrompt({text, onCLick, fontSize}) {
    const textRef = useRef();
    const {size} = useThree();
    const [hovered, setHover] = useState(false)

    // Update the position of the text sprite on each frame
    useFrame(({clock}) => {
        if (textRef.current) {
            textRef.current.position.y = 0.05 * Math.sin(4*clock.elapsedTime)
        }
    });

    return (
        <Text
            onPointerOver={(event) => setHover(true)}
            onPointerOut={(event) => setHover(false)}
            ref={textRef}
            position={[0, 0, 0]}
            fontSize={hovered ? fontSize * 1.05 : fontSize}
            color={hovered ? "yellow" : "white"} // default
            anchorX="center" // default
            anchorY="middle" // default
            outlineWidth={0.05}
            fontWeight="bold"
            onClick={onCLick}
            font="MixBitFont-gww74.ttf"
            // position={[0, 0, 0]}
            // scale={[10, 10, 10]}
            // color="white"
            // anchorX="center"
            // anchorY="center"
            // textAlign="center"
            // outlineWidth={0.05}
            // outlineColor="black"
        >
            {text}
        </Text>
    )
}