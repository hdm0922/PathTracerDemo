import { World } from '../World';
import { InputController } from '../InputController';
import { SceneManager } from '../SceneManager';

// Renderer Renderer_TEST
import { Renderer } from '../Renderer_TEST';



/**
 * WebGPUEngine - WebGPU 초기화, 렌더 루프, 입력 처리를 통합 관리합니다.
 */
export class WebGPUEngine {
    private canvas: HTMLCanvasElement;
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private renderer: Renderer | null = null;
    private world: World;
    private inputController: InputController;
    private sceneManager: SceneManager;

    // Render loop
    private animationFrameId: number | null = null;
    private lastFrameTime: number = performance.now();
    private isRunning: boolean = false;

    // Callbacks
    public onFrameTimeUpdate: ((frameTime: number) => void) | null = null;
    public onCameraUpdate: ((position: { x: number; y: number; z: number }) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.world = new World();
        this.inputController = new InputController(canvas);
        this.sceneManager = new SceneManager(this.world);

        // Setup camera move callback
        this.inputController.onCameraMove = () => {
            if (this.renderer) {
                this.renderer.ResetFrameCount();
            }
        };
    }

    /**
     * WebGPU를 초기화하고 Scene을 로드합니다.
     * @param width - Canvas width
     * @param height - Canvas height
     * @param sceneId - Scene ID (optional)
     */
    public async initialize(width: number, height: number, sceneId?: string): Promise<void> {
        // Check WebGPU support
        if (!navigator.gpu) {
            throw new Error('WebGPU is not supported in this browser');
        }

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Create GPU resources
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error('Failed to get GPU adapter');
        }

        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            throw new Error('Failed to get GPU device');
        }

        // Load scene
        await this.sceneManager.loadScene(sceneId);

        // Create and initialize renderer
        this.renderer = new Renderer(this.adapter, this.device, this.canvas);
        await this.renderer.Initialize(this.world);

        // Setup input controller with camera
        this.inputController.setCamera(this.renderer.GetCamera());

        console.log('WebGPU Engine initialized successfully');
    }

    /**
     * 렌더 루프를 시작합니다.
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Engine is already running');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.renderLoop();
    }

    /**
     * 렌더 루프를 중지합니다.
     */
    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Scene을 전환합니다.
     * @param sceneId - Scene ID
     */
    public async switchScene(sceneId: string): Promise<void> {
        if (!this.renderer) {
            throw new Error('Engine not initialized');
        }

        await this.sceneManager.switchScene(sceneId);
        await this.renderer.Initialize(this.world);
    }

    /**
     * 캔버스 크기를 변경합니다.
     * @param width - New width
     * @param height - New height
     */
    public async resize(width: number, height: number): Promise<void> {
        if (!this.renderer) {
            throw new Error('Engine not initialized');
        }

        this.canvas.width = width;
        this.canvas.height = height;

        // Reinitialize renderer with new size
        await this.renderer.Initialize(this.world);
    }

    /**
     * 리소스를 정리합니다.
     */
    public dispose(): void {
        this.stop();
        this.inputController.dispose();
        this.renderer = null;
        this.device = null;
        this.adapter = null;
    }

    /**
     * 렌더 루프 (private)
     */
    private renderLoop = (): void => {
        if (!this.isRunning || !this.renderer) return;

        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        // Update frame time callback
        if (this.onFrameTimeUpdate) {
            this.onFrameTimeUpdate(deltaTime * 1000); // Convert back to milliseconds
        }

        // Handle input and update camera
        const cameraMoved = this.inputController.update(deltaTime);
        if (cameraMoved) {
            this.renderer.ResetFrameCount();
        }

        // Update camera position callback
        if (this.onCameraUpdate) {
            const camera = this.renderer.GetCamera();
            const cameraLocation = camera.GetLocation();
            this.onCameraUpdate({
                x: cameraLocation[0],
                y: cameraLocation[1],
                z: cameraLocation[2],
            });
        }

        // Render
        this.renderer.Update();
        this.renderer.Render();

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    };

    /**
     * Renderer를 반환합니다 (디버깅용)
     */
    public getRenderer(): Renderer | null {
        return this.renderer;
    }

    /**
     * World를 반환합니다 (디버깅용)
     */
    public getWorld(): World {
        return this.world;
    }
}
