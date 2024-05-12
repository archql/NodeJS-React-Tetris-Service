import * as THREE from 'three'
import {useFrame, useLoader, useThree} from "@react-three/fiber";
import {
    SpriteAnimator,
    Text, useSpriteLoader,
    useTexture,
} from "@react-three/drei";
import { extend } from "@react-three/fiber";
import React, {Fragment, useEffect, useMemo, useRef, useState} from "react";
import {SandShaderMaterial, WaveShaderMaterial} from "./shaders";
import {BufferAttribute} from "three";
import {COLOR_TABLE, COLOR_TABLE_NEW, FIELD_H, FIELD_W, Figure, FigureGhostId, FigureType} from "../../game/tetris";
import {animated, useSpring, useSpringRef} from "@react-spring/three";
import { easings } from '@react-spring/web'

extend({WaveShaderMaterial})

function toColor(r, g, b, a = 1.0) {
    return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`
}
export function nextRandInt(from, to) {
    return Math.floor(Math.random() * (to - from + 1)) + from;
}

export function GameDisplay({game /* : Tetris */}) {
    // TODO
    //console.log(`TETRIS ${JSON.stringify([...game.field])}`)
    return (
        <Fragment>
            <TetrisFigure
                figure={game.currentFigure}
                zPos={2}
            />
            <TetrisFigure
                figure={game.currentFigure}
                yPos={game.figPreviewY}
                zPos={1}
                opacity={0.4}
            />
            {/*<TetrisFigure*/}
            {/*    figure={new Figure(0)}*/}
            {/*    xPos={FIELD_W/2 - 2}*/}
            {/*    colorId={7}*/}
            {/*    yPos={2}*/}
            {/*    typeId={0}*/}
            {/*/>*/}
            {/*<TetrisFigure*/}
            {/*    figure={new Figure(0)}*/}
            {/*    xPos={FIELD_W/2 - 2}*/}
            {/*    colorId={7}*/}
            {/*    yPos={6}*/}
            {/*    typeId={1}*/}
            {/*/>*/}
            {/*<TetrisFigure*/}
            {/*    figure={new Figure(0)}*/}
            {/*    xPos={FIELD_W/2 - 2}*/}
            {/*    colorId={7}*/}
            {/*    yPos={10}*/}
            {/*    typeId={2}*/}
            {/*/>*/}
            {/*<TetrisFigure*/}
            {/*    figure={new Figure(0)}*/}
            {/*    xPos={FIELD_W/2 - 2}*/}
            {/*    colorId={7}*/}
            {/*    yPos={14}*/}
            {/*    typeId={3}*/}
            {/*/>*/}
            {/*<TetrisFigure*/}
            {/*    figure={new Figure(0)}*/}
            {/*    xPos={FIELD_W/2 - 2}*/}
            {/*    colorId={7}*/}
            {/*    yPos={18}*/}
            {/*    typeId={4}*/}
            {/*/>*/}
            <TetrisEffects
                effects={game.effects}
                field={game.field}
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

export function ProgressBar({pos, width, scoreA, scoreB, scoreMax}) {

    // default progress
    const p = 0.1;
    //
    const progressA = scoreA / scoreMax * width;
    const progressB = scoreB / scoreMax * width;
    
    return (
        <group position={pos}>
            <mesh position={[0, 0, -0.1]}>
                <planeGeometry args={[width + 2*p, 1]}/>
                <meshBasicMaterial color="#f2f2f2"/>
            </mesh>
            {/*red*/}
            <mesh position={[(-width + progressA) / 2 + p, 0, -0.05]} scale={[1, 0.9, 1]}>
                <planeGeometry args={[progressA + p, 1]}/>
                <meshBasicMaterial color="red"/>
            </mesh>

            {/*blue*/}
            <mesh position={[(width - progressB) / 2 - p, 0, -0.05]} scale={[-1, 0.9, 1]}>
                <planeGeometry args={[progressB + p, 1]}/>
                <meshBasicMaterial color="blue"/>
            </mesh>
        </group>
    )
}

export function TetrisText(props) {
    return (
        <Text
            anchorX="left" // default
            anchorY="middle" // default
            font="MixBitFont-gww74.ttf"
            outlineColor={"#3d405c"}
            color={"#575760"}
            material-toneMapped={false}
            {...props}
        />
    )
}

export function TetrisFigure({figure, colorId, zPos, xPos, yPos, typeId, opacity, score}) {
    if (!figure) return null

    const components = []
    const x = xPos ?? figure.x;
    const y = yPos ?? figure.y;
    const z = zPos ?? 0;
    const pos = [x, y, z]
    const color = (colorId !== undefined) ? colorId : figure.color;
    const type = (typeId !== undefined) ? typeId : figure.type;
    const sc = (score !== undefined) ? score : (figure.score ?? 0);

    let fig = figure.value;

    for (let i = 0; i < 4; i++) { // 4 is fig w and h
        const yPos = i * FIELD_W;
        for (let j = 0; j < 4; j++) {
            if ((fig & 0x8000) !== 0) {
                components.push(
                    <TetrisBlock
                        key={j + yPos}
                        position={[j, i, 0]}
                        type={type}
                        clr={color}
                        score={sc}
                        opacity={opacity}
                    />
                );
            }
            fig <<= 1;
        }
    }
    return (
        <group position={pos}>
            {components}
        </group>
    )
}
const AnimatedText = animated(Text)

export function AnimatedScore({score, color}) {
    const spring = useSpring({
        from: { scale: [1, -1, 1] },
        to: { scale: [0, 0, 0] },
        config: {
            easing: easings.easeInBack,
            duration: 400,
        },
    });
    return (
        <AnimatedText
            anchorX="center" // default
            anchorY="middle" // default
            font="MixBitFont-gww74.ttf"
            color={color}
            material-toneMapped={false}
            text={score.toString()}
            position={[0, 0, 0.1]}
            fontWeight={"bold"}
            scale={[1, -1, 1]}
            fontSize={0.8}
            outlineWidth={0.1}
            outlineColor={"#222"}
            {...spring}
        />
    )
}
export function DelayedSpriteAnimator({delay, spriteDataset, onEnd, position}) {
    const [ready, setReady] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    useFrame((_, deltaTime) => {
        setElapsedTime(elapsedTime + deltaTime);
        if (elapsedTime >= delay) {
            setReady(true)
        }
    });

    return (
        ready &&
        <SpriteAnimator
            fps={30}
            autoPlay={true}
            scale={2}
            spriteDataset={spriteDataset}
            frameName={'explosion'}
            animationNames={['explosion']}
            alphaTest={0.01}
            asSprite={true}
            onEnd={onEnd}
            position={position}
        />
    )
}
export function TetrisEffects({effects, field, position}) {
    const { spriteObj } = useSpriteLoader(
        'sprite.png',
        'sprite_block.json',

        ['explosion', 'upgrade'],
        null
    );
    const components = []
    for (let i = 0; i < FIELD_H; ++i) {
        const yPos = i * FIELD_W;
        for (let j = 0; j < FIELD_W; ++j) {
            const block = field[j + yPos];
            const effect = effects[j + yPos];
            const c = COLOR_TABLE_NEW[effect.color];
            if (effect?.type === 1) {
                components.push(
                    <group position={[j, i, 2]} key={j + yPos}>
                    <SpriteAnimator
                        fps={30}
                        rotation={[0, 0, Math.PI / 2]}
                        autoPlay={true}
                        scale={2}
                        spriteDataset={spriteObj}
                        frameName={'explosion'}
                        animationNames={['explosion']}
                        alphaTest={0.01}
                        asSprite={false}
                        onEnd={() => {effect.type = null}}
                    />
                    <AnimatedScore
                        score={effect.score}
                        color={c}
                    />
                    </group>
                )
            }
            else if (effect?.type === 2) {
                components.push(
                    <group position={[j, i, 2]} key={j + yPos}>
                    <SpriteAnimator
                        fps={30}
                        rotation={[0, 0, Math.PI / 2]}
                        autoPlay={true}
                        scale={4}
                        spriteDataset={spriteObj}
                        frameName={'explosion'}
                        animationNames={['explosion']}
                        alphaTest={0.01}
                        asSprite={false}
                        onEnd={() => {effect.type = null}}
                    />
                    <AnimatedScore
                        score={effect.score}
                        color={c}
                    />
                    </group>
                )
            } else if (effect?.type === 4) {
                components.push(
                    <group position={[j, i, 2]} key={j + yPos}>
                    <DelayedSpriteAnimator
                        spriteDataset={spriteObj}
                        onEnd={() => {effect.type = null}}
                        delay={effect.delay ?? 0}
                    />
                    </group>
                )
            }
            else if (effect?.type === 3) {
                const c = COLOR_TABLE_NEW[block.color];
                components.push(
                    <group position={[j, i, 2]} key={j + yPos}>
                        <Text
                            anchorX="center" // default
                            anchorY="middle" // default
                            font="MixBitFont-gww74.ttf"
                            color={c}
                            material-toneMapped={false}
                            text={block.score.toString()}
                            position={[0, 0, 0.1]}
                            fontWeight={"bold"}
                            scale={[1, -1, 1]}
                            fontSize={0.8}
                            outlineWidth={0.1}
                            outlineColor={"#222"}
                        />
                    </group>
                )
            } else if (effect?.type === 5) {
                components.push(
                    <group position={[j, i, 2]} key={j + yPos}>
                        <SpriteAnimator
                            fps={30}
                            autoPlay={true}
                            scale={1.5}
                            rotation={[0, 0, Math.PI]}
                            spriteDataset={spriteObj}
                            frameName={'upgrade'}
                            animationNames={['upgrade']}
                            alphaTest={0.01}
                            asSprite={false}
                            onEnd={() => {
                                effect.type = null
                            }}
                        />
                    </group>
                )
            }
        }
    }
    return (
        <group position={position} >
            {components}
        </group>
    )
}

export function TetrisField({field}) {
    const components = []
    for (let i = 0; i < FIELD_H; ++i) {
        const yPos = i * FIELD_W;
        for (let j = 0; j < FIELD_W; ++j) {
            const block = field[j + yPos]
            if (!block.color) continue
            components.push(
                <TetrisBlock
                    key={j + yPos}
                    position={[j, i, 0]}
                    type={block.type}
                    clr={block.color}
                    score={block.score}
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

export function TetrisBlock ({ position, type, clr, opacity, score }) {
    const particleCount = 100;
    const textureMetal = useTexture('/block_metal.png');
    const textureReinforced = useTexture('/block_reinforced.png');
    const textureBorder = useTexture('/block_border.png');
    const textureTNT = useTexture('/block_tnt.png');
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

    const c = COLOR_TABLE_NEW[clr];
    const t = FigureType.at(type);
    const o = opacity ?? 1.0

    let txt;
    switch (score) {
        case 2: txt = textureReinforced; break;
        case 3: txt = textureMetal; break;
        default: txt = texture;
    }

    const col = Math.floor((Math.sin(6*time) * 0.5 + 0.7) * 255);
    switch (t) {
        case 'liquid': return (
            <mesh position={position}>
                <boxGeometry args={[1, 1, 1, 8, 8, 2]}/>
                <waveShaderMaterial uColor={c} uTexture={txt} uTime={time} transparent={true} uOpacity={o}/>
            </mesh>
        )
        case 'ghost': return (
            <mesh position={position}>
                <boxGeometry/>
                <meshBasicMaterial
                    map={txt}
                    transparent={true}
                    opacity={(Math.sin(6*time) * 0.1 + 0.5) * o}
                    color={c}
                />
            </mesh>
        )
        case 'tnt': return (
            <mesh position={position}>
                <boxGeometry/>
                <meshBasicMaterial
                    map={textureTNT}
                    transparent={true}
                    color={`rgba(255, ${col}, ${col}, 1)`}
                    opacity={o}
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
                        transparent={true}
                        opacity={o}
                    />
                </points>
                <mesh position={position}>
                    <boxGeometry/>
                    <meshBasicMaterial
                        map={txt}
                        transparent={true}
                        color={c}
                        opacity={o}
                    />
                </mesh>
            </Fragment>
        )
        case 'border':
            return (
                <mesh position={position}>
                    <boxGeometry/>
                    <meshBasicMaterial
                        map={textureBorder}
                        transparent={true}
                        color={c}
                        opacity={o}
                    />
                </mesh>
            )
        default:
            return (
                <mesh position={position}>
                    <boxGeometry/>
                    <meshBasicMaterial
                        map={txt}
                        transparent={true}
                        color={c}
                        opacity={o}
                    />
                </mesh>
            )
    }
}

export function TitlePrompt({text, onCLick, fontSize, interactive}) {
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
            material-toneMapped={false}
            onPointerOver={(event) => setHover(interactive ?? true)}
            onPointerOut={(event) => setHover(false)}
            ref={textRef}
            fontSize={hovered ? fontSize * 1.05 : fontSize}
            color={hovered ? "yellow" : "#adabbe"} // default
            anchorX="center" // default
            anchorY="middle" // default
            outlineWidth={0.2}
            outlineColor={"#3d405c"}
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