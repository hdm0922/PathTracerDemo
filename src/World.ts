import { vec3 } from "gl-matrix";



export class Camera
{

    public Position : vec3;
    public LookAt   : vec3;
    public Up       : vec3;
    public FovY     : number;



    constructor(
        Position    = [0,0,0],
        LookAt      = [0,0,0],
        Up          = [0,1,0],
        FovY        = 0.25
    )
    {
        this.Position = Position;
        this.LookAt = LookAt;
        this.Up = Up;
        this.FovY = FovY;
    }

}



export class Sphere
{
    public Center: vec3;
    public Radius: number;
    public BaseColor: vec3;

    constructor(
        Center = [0,0,0],
        Radius = 0.5,
        BaseColor = [1,0,0]
    )
    {
        this.Center = Center;
        this.Radius = Radius;
        this.BaseColor = BaseColor;
    }
}



export class RectLight
{
    public Center: vec3;
    public U: vec3;
    public V: vec3;
    public Radiance: vec3;
    public Enabled: boolean;

    constructor(
        Center = [0,0,0],
        U = [0,0,0],
        V = [0,0,0],
        Radiance = [0,0,0],
        Enabled = true
    )
    {
        this.Center = Center;
        this.U = U;
        this.V = V;
        this.Radiance = Radiance;
        this.Enabled = Enabled;
    }

}



export class World
{

    private Camera: Camera;
    private Objects: Sphere[]
    private Lights: RectLight[]

    constructor()
    {
        this.Camera = new Camera();

        this.Objects = 
        [
            new Sphere(), 
            new Sphere()
        ];

        this.Lights =
        [
            new RectLight()
        ]
    }

    Initialize(): void
    {

        // Some Modifications
        this.Camera.Position = [0,0,10];
        this.Objects[0].Center = [5,0,0];
        this.Lights[0].Center = [0,0,4];

        return;
    }

    Render(): void
    {

        return;
    }
}