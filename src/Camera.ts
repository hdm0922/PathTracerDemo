import { vec3, quat, mat4 } from "wgpu-matrix"
import type { Vec3, Quat, Mat4  } from "wgpu-matrix";

export class Camera
{

    private Location! : Vec3;
    private Roll!   : number; // 대부분의 상황에서는 고정
    private Pitch!  : number; // 상하
    private Yaw!    : number; // 좌우

    private AspectRatio!    : number;
    private FOV!            : number;
    private Near!           : number;
    private Far!            : number;

    private ProjectionMatrix! : Mat4;

    constructor
    (
        Width       : number, 
        Height      : number, 
        InLocation  : Vec3      = vec3.fromValues(0,0,1),
        InRoll      : number    = 0,
        InPitch     : number    = 0,
        InYaw       : number    = 0,
        InFOV       : number    = (60 * Math.PI) / 180.0,
        InNear      : number    = 0.1,
        InFar       : number    = 1000
    )
    {
        this.Location = InLocation;

        this.Roll   = InRoll;
        this.Pitch  = InPitch;
        this.Yaw    = InYaw;

        this.AspectRatio    = Width / Height;
        this.FOV            = InFOV;
        this.Near           = InNear;
        this.Far            = InFar;

        this.ProjectionMatrix = this.computeProjectionMatrix();
    }

    public GetViewProjectionMatrix() : Mat4
    {
        const ViewMatrix : Mat4 = this.GetViewMatrix();
        const ProjectionMatrix : Mat4 = this.ProjectionMatrix;

        return mat4.multiply(ProjectionMatrix, ViewMatrix);
    }

    public GetViewMatrix() : Mat4
    {
        const TranslationMatrix : Mat4 = mat4.translation(this.Location);
        const RotationMatrix    : Mat4 = mat4.fromQuat(quat.fromEuler(this.Pitch, this.Yaw, this.Roll, "yxz"));

        const WorldMatrix       : Mat4 = mat4.multiply(TranslationMatrix, RotationMatrix);
        const ViewMatrix        : Mat4 = mat4.invert(WorldMatrix);

        return ViewMatrix;
    }

    public GetForwardVector() : Vec3
    {
        const BaseForward   : Vec3 = vec3.fromValues(0,0,-1);
        const RotationQuat  : Quat = quat.fromEuler(this.Pitch, this.Yaw, this.Roll, "yxz");

        const ForwardVector : Vec3 = vec3.transformQuat(BaseForward, RotationQuat);
        return vec3.normalize(ForwardVector);
    }

    public GetRightVector() : Vec3
    {
        const ForwardVector : Vec3 = this.GetForwardVector();
        const UpVector : Vec3 = vec3.fromValues(0,1,0);

        return vec3.cross(ForwardVector, UpVector);
    }

    public GetLocation() : Vec3
    {
        return this.Location;
    }

    public SetPitch(InPitchDegree : number) : void
    {
        const InPitch : number = (InPitchDegree * Math.PI) / 180.0;

        this.Pitch = Math.min(Math.PI, Math.max(-Math.PI, InPitch));

        return;
    }

    public SetYaw(InYawDegree : number) : void
    {
        const InYaw : number = (InYawDegree * Math.PI) / 180.0;

        this.Yaw = InYaw % 360;

        return;
    }

    public SetLocation(InLocation : Vec3) : void
    {
        this.Location = InLocation;

        return;
    }
    
    public SetLocationFromXYZ(X : number, Y : number, Z : number) : void
    {
        this.Location[0] = X;
        this.Location[1] = Y;
        this.Location[2] = Z;

        return;
    }

    public SetAspectRatio(Width : number, Height : number) : void
    {
        this.AspectRatio = Width / Height;
        this.ProjectionMatrix = this.computeProjectionMatrix();

        return;
    }

    private computeProjectionMatrix() : Mat4
    {
        return mat4.perspective(this.FOV, this.AspectRatio, this.Near, this.Far);
    }
};