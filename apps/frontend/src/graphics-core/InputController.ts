import { vec3, type Vec3 } from 'wgpu-matrix';
import type { Camera } from './Camera';

/**
 * InputController - 키보드/마우스 입력을 처리하고 카메라를 제어합니다.
 */
export class InputController {
    private canvas: HTMLCanvasElement;
    private camera: Camera | null = null;

    // Keyboard state
    private pressedKeys: Set<string> = new Set();

    // Mouse state
    private isMouseDown: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    // Settings
    private moveSpeed: number = 5.0; // Units per second
    private mouseSensitivity: number = 0.1;

    // Event listeners (for cleanup)
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundKeyUp: (e: KeyboardEvent) => void;
    private boundMouseDown: (e: MouseEvent) => void;
    private boundMouseUp: () => void;
    private boundMouseMove: (e: MouseEvent) => void;

    // Callback when camera moves
    public onCameraMove: (() => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        // Bind event handlers
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);

        this.attachEventListeners();
    }

    /**
     * 카메라를 설정합니다.
     */
    public setCamera(camera: Camera): void {
        this.camera = camera;
    }

    /**
     * 이벤트 리스너를 등록합니다.
     */
    private attachEventListeners(): void {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mouseup', this.boundMouseUp);
        window.addEventListener('mousemove', this.boundMouseMove);
    }

    /**
     * 이벤트 리스너를 제거합니다.
     */
    public dispose(): void {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('mousemove', this.boundMouseMove);
        document.exitPointerLock();
    }

    /**
     * 키보드/마우스 입력을 처리하여 카메라를 업데이트합니다.
     * @param deltaTime - Frame delta time (seconds)
     * @returns 카메라가 움직였는지 여부
     */
    public update(deltaTime: number): boolean {
        if (!this.camera || this.pressedKeys.size === 0) {
            return false;
        }

        const forwardVector: Vec3 = this.camera.GetForwardVector();
        const rightVector: Vec3 = this.camera.GetRightVector();
        const upVector: Vec3 = vec3.fromValues(0, 1, 0);
        const moveOffset: Vec3 = vec3.create(0, 0, 0);

        // Apply delta time for frame-rate independent movement
        const frameAdjustedSpeed = this.moveSpeed * deltaTime;

        if (this.pressedKeys.has('w')) {
            vec3.addScaled(moveOffset, forwardVector, frameAdjustedSpeed, moveOffset);
        }
        if (this.pressedKeys.has('s')) {
            vec3.addScaled(moveOffset, forwardVector, -frameAdjustedSpeed, moveOffset);
        }
        if (this.pressedKeys.has('a')) {
            vec3.addScaled(moveOffset, rightVector, -frameAdjustedSpeed, moveOffset);
        }
        if (this.pressedKeys.has('d')) {
            vec3.addScaled(moveOffset, rightVector, frameAdjustedSpeed, moveOffset);
        }
        if (this.pressedKeys.has('q')) {
            vec3.addScaled(moveOffset, upVector, -frameAdjustedSpeed, moveOffset);
        }
        if (this.pressedKeys.has('e')) {
            vec3.addScaled(moveOffset, upVector, frameAdjustedSpeed, moveOffset);
        }

        if (vec3.length(moveOffset) > 0) {
            this.camera.AddLocationOffset(moveOffset);
            return true;
        }

        return false;
    }

    // Event Handlers
    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
            this.pressedKeys.add(key);
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        this.pressedKeys.delete(key);
    }

    private handleMouseDown(event: MouseEvent): void {
        this.isMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.canvas.requestPointerLock();
    }

    private handleMouseUp(): void {
        this.isMouseDown = false;
        document.exitPointerLock();
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isMouseDown || !this.camera) return;

        const deltaX = event.movementX;
        const deltaY = event.movementY;

        this.camera.AddYaw(-deltaX * this.mouseSensitivity);
        this.camera.AddPitch(-deltaY * this.mouseSensitivity);

        // Notify camera moved
        if (this.onCameraMove) {
            this.onCameraMove();
        }
    }
}
